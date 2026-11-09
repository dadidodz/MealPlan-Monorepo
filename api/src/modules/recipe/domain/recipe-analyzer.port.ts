import { DownloadedVideo } from './video-downloader.port';
import { RecipeCategory } from './recipe-category';

export const RECIPE_ANALYZER = Symbol('RecipeAnalyzer');

export interface ExtractedRecipeDraft {
    title: string;
    description: string | null;
    basePortions: number;
    instructions: string[];
    ingredients: {
        name: string;
        quantity: number | null;
        unit: string | null;
    }[];
    category: RecipeCategory;
    sourceUrl?: string;
}

/** A draft and what produced it, stored with the extraction. */
export interface RecipeAnalysis {
    draft: ExtractedRecipeDraft;
    aiModel: string;
    promptVersion: string;
}

export interface RecipeAnalyzerPort {
    /**
     * Analyses a video and extracts a structured recipe from it
     * @param video The downloaded video
     * @returns The extracted recipe draft, with the model and prompt version used
     * @throws Error if the AI cannot understand the video
     */
    analyze(video: DownloadedVideo): Promise<RecipeAnalysis>;
}
