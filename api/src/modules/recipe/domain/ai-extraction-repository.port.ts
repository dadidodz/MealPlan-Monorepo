import { Temporal } from '@js-temporal/polyfill';
import { ExtractedRecipeDraft, RecipeAnalysis } from './recipe-analyzer.port';
import { ExtractionStatus, RecipeAiExtraction } from './recipe-ai-extraction.entity';

export const AI_EXTRACTION_REPOSITORY = Symbol('AiExtractionRepository');

/** An analysis and the time it ended, stored together when an extraction succeeds. */
export interface FinishedAnalysis extends RecipeAnalysis {
    extractedAt: Temporal.Instant;
}

export interface AiExtractionRepository {
    findByUrl(url: string): Promise<RecipeAiExtraction | null>;
    /** Creates or resets the extraction of a URL: model and prompt version are cleared. */
    upsert(url: string, status: ExtractionStatus, data?: ExtractedRecipeDraft): Promise<void>;
    /** With an analysis: also stores its draft, model, prompt version and `extractedAt`. */
    updateStatus(url: string, status: ExtractionStatus, analysis?: FinishedAnalysis): Promise<void>;
}
