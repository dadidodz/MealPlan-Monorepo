import { Observable, ReplaySubject } from 'rxjs';
import { ExtractionJobNotFoundError } from './extraction-job-not-found.error';
import { ExtractionJobs, JobResult } from './extraction-jobs.port';

/** Like the in-memory adapter, but jobs never expire and ids are predictable. */
export class FakeExtractionJobs implements ExtractionJobs {
    private readonly jobs = new Map<string, ReplaySubject<JobResult>>();

    start(work: () => Promise<JobResult>): string {
        const jobId = `job-${this.jobs.size + 1}`;
        const job = new ReplaySubject<JobResult>(1);
        this.jobs.set(jobId, job);
        void work().then(
            (result) => {
                job.next(result);
                job.complete();
            },
            (error: unknown) => job.error(error),
        );
        return jobId;
    }

    stream(jobId: string): Observable<JobResult> {
        const job = this.jobs.get(jobId);
        if (!job) throw new ExtractionJobNotFoundError(jobId);
        return job.asObservable();
    }
}
