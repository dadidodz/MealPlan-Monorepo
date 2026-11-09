import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, ReplaySubject } from 'rxjs';
import { ExtractionJobNotFoundError } from '../domain/extraction-job-not-found.error';
import { ExtractionJobs, JobResult } from '../domain/extraction-jobs.port';

/** How long a finished job keeps its result for a late SSE subscriber. */
export const RESULT_RETENTION_MS = 60_000;

/** Jobs live in this process: lost on restart, not shared between instances. */
@Injectable()
export class InMemoryExtractionJobs implements ExtractionJobs {
    private readonly logger = new Logger(InMemoryExtractionJobs.name);
    private readonly jobs = new Map<string, ReplaySubject<JobResult>>();

    start(work: () => Promise<JobResult>): string {
        const jobId = randomUUID();
        // Replays the result to whoever subscribes after the job ended
        const job = new ReplaySubject<JobResult>(1);
        this.jobs.set(jobId, job);

        void work()
            .then(
                (result) => {
                    job.next(result);
                    job.complete();
                },
                (error: unknown) => {
                    this.logger.error(`Extraction job ${jobId} crashed`, error);
                    job.error(error);
                },
            )
            .finally(() => {
                setTimeout(() => this.jobs.delete(jobId), RESULT_RETENTION_MS).unref();
            });

        return jobId;
    }

    stream(jobId: string): Observable<JobResult> {
        const job = this.jobs.get(jobId);
        if (!job) throw new ExtractionJobNotFoundError(jobId);
        return job.asObservable();
    }
}
