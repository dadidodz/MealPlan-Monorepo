import { AiExtractionRepository } from '../domain/ai-extraction-repository.port';
import { ExtractionJobs, JobResult } from '../domain/extraction-jobs.port';
import { RecipeAnalysis, RecipeAnalyzerPort } from '../domain/recipe-analyzer.port';
import { RecipeRepository } from '../domain/recipe-repository.port';
import { VideoDownloaderPort } from '../domain/video-downloader.port';
import { Observable } from 'rxjs';
import { Clock } from '../../../shared/domain/clock.port';
import { DomainError } from '../../../shared/domain/domain-error';
import { UrlNormalizer } from '../domain/url-normalizer.port';

export type ExtractionCommandResult =
    { alreadyExists: true; recipeId: string } | { alreadyExists: false; jobId: string };

const EXTRACTION_FAILED: JobResult = {
    status: 'error',
    code: 'EXTRACTION_FAILED',
    message: 'AI extraction failed',
};

export class ExtractRecipeDraftUseCase {
    constructor(
        private readonly videoDownloader: VideoDownloaderPort,
        private readonly recipeAnalyzer: RecipeAnalyzerPort,
        private readonly recipeRepository: RecipeRepository,
        private readonly extractionRepository: AiExtractionRepository,
        private readonly jobs: ExtractionJobs,
        private readonly clock: Clock,
        private readonly urlNormalizer: UrlNormalizer,
    ) {}

    async execute(rawUrl: string): Promise<ExtractionCommandResult> {
        const canonicalUrl = await this.urlNormalizer.normalize(rawUrl);

        const existingRecipe = await this.recipeRepository.findBySourceUrl(canonicalUrl);

        if (existingRecipe) {
            return {
                alreadyExists: true,
                recipeId: existingRecipe.id,
            };
        }

        const extraction = await this.extractionRepository.findByUrl(canonicalUrl);
        const cachedDraft = extraction?.status === 'SUCCESS' ? extraction.extractedData : null;

        if (cachedDraft) {
            const jobId = this.jobs.start(() =>
                Promise.resolve({ status: 'success', data: cachedDraft }),
            );
            return { alreadyExists: false, jobId };
        }

        // Known gap: a URL still IN_PROGRESS is extracted again, calling Gemini twice (BACKLOG "Extraction input limits")
        await this.extractionRepository.upsert(canonicalUrl, 'IN_PROGRESS');
        const jobId = this.jobs.start(() => this.extract(canonicalUrl));

        return {
            alreadyExists: false,
            jobId,
        };
    }

    public getJobStream(jobId: string): Observable<JobResult> {
        return this.jobs.stream(jobId);
    }

    private async extract(canonicalUrl: string): Promise<JobResult> {
        let analysis: RecipeAnalysis;
        try {
            const downloadedVideo = await this.videoDownloader.download(canonicalUrl);
            analysis = await this.recipeAnalyzer.analyze(downloadedVideo);
        } catch (error: unknown) {
            // The adapters already logged the cause
            await this.extractionRepository.updateStatus(canonicalUrl, 'ERROR');
            // A known failure (not a recipe, unusable AI answer, video not downloadable) keeps its code: the UI explains it
            return error instanceof DomainError
                ? { status: 'error', code: error.code, message: error.message }
                : EXTRACTION_FAILED;
        }

        const recipeDraft = { ...analysis.draft, sourceUrl: canonicalUrl };
        // Outside the try: a failed save crashes the job, and the jobs adapter logs it
        await this.extractionRepository.updateStatus(canonicalUrl, 'SUCCESS', {
            ...analysis,
            draft: recipeDraft,
            extractedAt: this.clock.now(),
        });

        return { status: 'success', data: recipeDraft };
    }
}
