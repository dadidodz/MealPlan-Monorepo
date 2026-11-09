import { Module } from '@nestjs/common';
import { CreateRecipeUseCase } from './application/create-recipe.use-case';
import { ExtractRecipeDraftUseCase } from './application/extract-recipe-draft.use-case';
import { GetAllRecipesUseCase } from './application/get-all-recipes.use-case';
import { GetCachedExtractionUseCase } from './application/get-cached-extraction.use-case';
import { GetRecipeByIdUseCase } from './application/get-recipe-by-id.use-case';
import { UpdateRecipeUseCase } from './application/update-recipe.use-case';
import {
    AI_EXTRACTION_REPOSITORY,
    AiExtractionRepository,
} from './domain/ai-extraction-repository.port';
import { EXTRACTION_JOBS, ExtractionJobs } from './domain/extraction-jobs.port';
import { RECIPE_ANALYZER, RecipeAnalyzerPort } from './domain/recipe-analyzer.port';
import { RECIPE_READER, RecipeReader } from './domain/recipe-reader.port';
import { RECIPE_REPOSITORY, RecipeRepository } from './domain/recipe-repository.port';
import { VIDEO_DOWNLOADER, VideoDownloaderPort } from './domain/video-downloader.port';
import { URL_NORMALIZER, UrlNormalizer } from './domain/url-normalizer.port';
import { GeminiRecipeAnalyzer } from './infrastructure/gemini-recipe-analyzer.adapter';
import { InMemoryExtractionJobs } from './infrastructure/in-memory-extraction-jobs';
import { PrismaAiExtractionRepository } from './infrastructure/prisma-ai-extraction.repository';
import { PrismaRecipeReader } from './infrastructure/prisma-recipe.reader';
import { PrismaRecipeRepository } from './infrastructure/prisma-recipe.repository';
import { YtDlpVideoDownloader } from './infrastructure/yt-dlp-video-downloader.adapter';
import { FetchUrlNormalizer } from './infrastructure/fetch-url-normalizer.adapter';
import { RecipeController } from './presentation/recipe.controller';
import { CLOCK, Clock } from '../../shared/domain/clock.port';

@Module({
    controllers: [RecipeController],
    providers: [
        // Ports → adapters
        { provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepository },
        { provide: RECIPE_READER, useClass: PrismaRecipeReader },
        { provide: AI_EXTRACTION_REPOSITORY, useClass: PrismaAiExtractionRepository },
        { provide: RECIPE_ANALYZER, useClass: GeminiRecipeAnalyzer },
        { provide: VIDEO_DOWNLOADER, useClass: YtDlpVideoDownloader },
        { provide: EXTRACTION_JOBS, useClass: InMemoryExtractionJobs },
        { provide: URL_NORMALIZER, useClass: FetchUrlNormalizer },

        // Use cases, built from the ports
        {
            provide: CreateRecipeUseCase,
            useFactory: (
                recipes: RecipeRepository,
                extractions: AiExtractionRepository,
                clock: Clock,
            ): CreateRecipeUseCase => new CreateRecipeUseCase(recipes, extractions, clock),
            inject: [RECIPE_REPOSITORY, AI_EXTRACTION_REPOSITORY, CLOCK],
        },
        {
            provide: GetAllRecipesUseCase,
            useFactory: (reader: RecipeReader): GetAllRecipesUseCase =>
                new GetAllRecipesUseCase(reader),
            inject: [RECIPE_READER],
        },
        {
            provide: GetRecipeByIdUseCase,
            useFactory: (recipes: RecipeRepository): GetRecipeByIdUseCase =>
                new GetRecipeByIdUseCase(recipes),
            inject: [RECIPE_REPOSITORY],
        },
        {
            provide: GetCachedExtractionUseCase,
            useFactory: (
                extractions: AiExtractionRepository,
                urlNormalizer: UrlNormalizer,
            ): GetCachedExtractionUseCase =>
                new GetCachedExtractionUseCase(extractions, urlNormalizer),
            inject: [AI_EXTRACTION_REPOSITORY, URL_NORMALIZER],
        },
        {
            provide: UpdateRecipeUseCase,
            useFactory: (recipes: RecipeRepository, clock: Clock): UpdateRecipeUseCase =>
                new UpdateRecipeUseCase(recipes, clock),
            inject: [RECIPE_REPOSITORY, CLOCK],
        },
        {
            provide: ExtractRecipeDraftUseCase,
            useFactory: (
                videoDownloader: VideoDownloaderPort,
                recipeAnalyzer: RecipeAnalyzerPort,
                recipes: RecipeRepository,
                extractions: AiExtractionRepository,
                jobs: ExtractionJobs,
                clock: Clock,
                urlNormalizer: UrlNormalizer,
            ): ExtractRecipeDraftUseCase =>
                new ExtractRecipeDraftUseCase(
                    videoDownloader,
                    recipeAnalyzer,
                    recipes,
                    extractions,
                    jobs,
                    clock,
                    urlNormalizer,
                ),
            inject: [
                VIDEO_DOWNLOADER,
                RECIPE_ANALYZER,
                RECIPE_REPOSITORY,
                AI_EXTRACTION_REPOSITORY,
                EXTRACTION_JOBS,
                CLOCK,
                URL_NORMALIZER,
            ],
        },
    ],
})
export class RecipeModule {}
