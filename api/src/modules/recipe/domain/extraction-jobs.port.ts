import { Observable } from 'rxjs';
import { ExtractedRecipeDraft } from './recipe-analyzer.port';

export const EXTRACTION_JOBS = Symbol('ExtractionJobs');

/** What the SSE stream sends when a job ends. `code` is stable for the UI; `message` is not meant for users. */
export type JobResult =
    | { status: 'success'; data: ExtractedRecipeDraft }
    | { status: 'error'; code: string; message: string };

/** Background extraction jobs, followed by id. */
export interface ExtractionJobs {
    /** Runs `work` in the background and returns the new job's id at once. */
    start(work: () => Promise<JobResult>): string;
    /**
     * The job's result, still available for a while after the job ended.
     * @throws ExtractionJobNotFoundError for an unknown or expired job
     */
    stream(jobId: string): Observable<JobResult>;
}
