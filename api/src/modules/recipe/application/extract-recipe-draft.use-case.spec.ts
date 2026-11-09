import { Temporal } from '@js-temporal/polyfill';
import { lastValueFrom } from 'rxjs';
import { FixedClock } from '../../../shared/domain/clock.fake';
import { InMemoryAiExtractionRepository } from '../domain/ai-extraction-repository.fake';
import { ExtractionJobNotFoundError } from '../domain/extraction-job-not-found.error';
import { FakeExtractionJobs } from '../domain/extraction-jobs.fake';
import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import { InMemoryRecipeRepository, aRecipe } from '../domain/recipe-repository.fake';
import { FakeVideoDownloader } from '../domain/video-downloader.fake';
import { FakeUrlNormalizer } from '../domain/url-normalizer.fake';
import { InvalidAiOutputError } from '../domain/invalid-ai-output.error';
import { NotARecipeError } from '../domain/not-a-recipe.error';
import { VideoDownloadFailedError } from '../domain/video-download-failed.error';
import { ExtractRecipeDraftUseCase } from './extract-recipe-draft.use-case';

describe('ExtractRecipeDraftUseCase', () => {
    const url = 'https://www.tiktok.com/@chef/video/123';
    const now = Temporal.Instant.from('2026-10-08T18:02:00Z');
    let downloader: FakeVideoDownloader;
    let analyzer: FakeRecipeAnalyzer;
    let recipes: InMemoryRecipeRepository;
    let extractions: InMemoryAiExtractionRepository;
    let useCase: ExtractRecipeDraftUseCase;

    /** Lets every pending promise settle, like a UI that opens the stream a moment later. */
    const later = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

    const jobIdOf = async (rawUrl: string): Promise<string> => {
        const result = await useCase.execute(rawUrl);
        if (result.alreadyExists) throw new Error('Expected a job');
        return result.jobId;
    };

    beforeEach(() => {
        downloader = new FakeVideoDownloader();
        analyzer = new FakeRecipeAnalyzer();
        recipes = new InMemoryRecipeRepository();
        extractions = new InMemoryAiExtractionRepository();
        useCase = new ExtractRecipeDraftUseCase(
            downloader,
            analyzer,
            recipes,
            extractions,
            new FakeExtractionJobs(),
            new FixedClock(now),
            new FakeUrlNormalizer(),
        );
    });

    it('returns the existing recipe of that URL without extracting', async () => {
        const recipe = aRecipe({ aiExtraction: { id: 'ext-1', sourceUrl: url } });
        await recipes.save(recipe);

        expect(await useCase.execute(`${url}?is_from_webapp=1`)).toEqual({
            alreadyExists: true,
            recipeId: recipe.id,
        });
        expect(downloader.requestedUrls).toEqual([]);
    });

    it('replays a cached successful extraction without downloading', async () => {
        await extractions.upsert(url, 'SUCCESS', { ...analyzer.draft, sourceUrl: url });

        const jobId = await jobIdOf(url);
        await later();

        expect(await lastValueFrom(useCase.getJobStream(jobId))).toEqual({
            status: 'success',
            data: { ...analyzer.draft, sourceUrl: url },
        });
        expect(downloader.requestedUrls).toEqual([]);
    });

    it('streams the draft of a new URL and stores it as a successful extraction', async () => {
        downloader.hold();

        const jobId = await jobIdOf(`${url}?is_from_webapp=1`);
        const result = lastValueFrom(useCase.getJobStream(jobId));
        downloader.finish();

        const expectedDraft = { ...analyzer.draft, sourceUrl: url };
        expect(await result).toEqual({ status: 'success', data: expectedDraft });
        expect(downloader.requestedUrls).toEqual([url]);
        expect(analyzer.analyzedVideos).toHaveLength(1);
        expect(extractions.statusHistory.get(url)).toEqual(['IN_PROGRESS', 'SUCCESS']);
        expect(extractions.extractions.get(url)).toMatchObject({
            extractedData: expectedDraft,
            aiModel: analyzer.aiModel,
            promptVersion: analyzer.promptVersion,
        });
        expect(extractions.extractions.get(url)?.extractedAt.equals(now)).toBe(true);
    });

    it('extracts again a URL whose extraction is still in progress', async () => {
        await extractions.upsert(url, 'IN_PROGRESS');
        downloader.hold();

        const jobId = await jobIdOf(url);
        const result = lastValueFrom(useCase.getJobStream(jobId));
        downloader.finish();

        expect(await result).toMatchObject({ status: 'success' });
        expect(downloader.requestedUrls).toEqual([url]);
    });

    it('streams EXTRACTION_FAILED and marks the extraction as failed on an unexpected error', async () => {
        downloader.hold();
        downloader.failure = new Error('Something unexpected');

        const jobId = await jobIdOf(url);
        const result = lastValueFrom(useCase.getJobStream(jobId));
        downloader.finish();

        expect(await result).toEqual({
            status: 'error',
            code: 'EXTRACTION_FAILED',
            message: 'AI extraction failed',
        });
        expect(extractions.statusHistory.get(url)).toEqual(['IN_PROGRESS', 'ERROR']);
    });

    it('streams an error and marks the extraction as failed when the analysis fails', async () => {
        downloader.hold();
        analyzer.failure = new Error('Not a recipe');

        const jobId = await jobIdOf(url);
        const result = lastValueFrom(useCase.getJobStream(jobId));
        downloader.finish();

        expect(await result).toMatchObject({ status: 'error' });
        expect(extractions.extractions.get(url)?.status).toBe('ERROR');
    });

    it.each([
        ['not a recipe', new NotARecipeError(), 'NOT_A_RECIPE'],
        ['an invalid AI answer', new InvalidAiOutputError('no title'), 'INVALID_AI_OUTPUT'],
    ])(
        'streams the code of %s and marks the extraction as failed',
        async (_case, failure, code) => {
            downloader.hold();
            analyzer.failure = failure;

            const jobId = await jobIdOf(url);
            const result = lastValueFrom(useCase.getJobStream(jobId));
            downloader.finish();

            expect(await result).toMatchObject({ status: 'error', code });
            expect(extractions.extractions.get(url)?.status).toBe('ERROR');
        },
    );

    it('streams VIDEO_DOWNLOAD_FAILED when the video cannot be fetched', async () => {
        downloader.hold();
        downloader.failure = new VideoDownloadFailedError();

        const jobId = await jobIdOf(url);
        const result = lastValueFrom(useCase.getJobStream(jobId));
        downloader.finish();

        expect(await result).toMatchObject({ status: 'error', code: 'VIDEO_DOWNLOAD_FAILED' });
        expect(extractions.extractions.get(url)?.status).toBe('ERROR');
    });

    it('errors the stream when saving the successful extraction fails', async () => {
        downloader.hold();
        const updateStatus = extractions.updateStatus.bind(extractions);
        vi.spyOn(extractions, 'updateStatus').mockImplementation((jobUrl, status, analysis) =>
            status === 'SUCCESS'
                ? Promise.reject(new Error('Database down'))
                : updateStatus(jobUrl, status, analysis),
        );

        const jobId = await jobIdOf(url);
        const result = lastValueFrom(useCase.getJobStream(jobId));
        downloader.finish();

        await expect(result).rejects.toThrow('Database down');
    });

    it('fails to stream an unknown job', () => {
        expect(() => useCase.getJobStream('missing')).toThrow(ExtractionJobNotFoundError);
    });
});
