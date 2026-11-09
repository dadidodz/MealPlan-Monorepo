import { Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ExtractionJobNotFoundError } from '../domain/extraction-job-not-found.error';
import { JobResult } from '../domain/extraction-jobs.port';
import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import { InMemoryExtractionJobs, RESULT_RETENTION_MS } from './in-memory-extraction-jobs';

describe('InMemoryExtractionJobs', () => {
    const success: JobResult = { status: 'success', data: new FakeRecipeAnalyzer().draft };
    let jobs: InMemoryExtractionJobs;

    beforeEach(() => {
        vi.useFakeTimers();
        jobs = new InMemoryExtractionJobs();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('streams the result of a running job', async () => {
        let finish!: (result: JobResult) => void;
        const jobId = jobs.start(() => new Promise((resolve) => (finish = resolve)));

        const result = lastValueFrom(jobs.stream(jobId));
        finish(success);

        expect(await result).toEqual(success);
    });

    it('still streams the result of a job that ended before the subscription', async () => {
        const jobId = jobs.start(() => Promise.resolve(success));
        await vi.advanceTimersByTimeAsync(RESULT_RETENTION_MS - 1);

        expect(await lastValueFrom(jobs.stream(jobId))).toEqual(success);
    });

    it('forgets a finished job after the retention delay', async () => {
        const jobId = jobs.start(() => Promise.resolve(success));
        await vi.advanceTimersByTimeAsync(RESULT_RETENTION_MS);

        expect(() => jobs.stream(jobId)).toThrow(ExtractionJobNotFoundError);
    });

    it('errors the stream and logs when the work crashes', async () => {
        const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        const jobId = jobs.start(() => Promise.reject(new Error('Database down')));

        await expect(lastValueFrom(jobs.stream(jobId))).rejects.toThrow('Database down');
        expect(logError).toHaveBeenCalled();
        logError.mockRestore();
    });

    it('fails to stream an unknown job', () => {
        expect(() => jobs.stream('missing')).toThrow(ExtractionJobNotFoundError);
    });
});
