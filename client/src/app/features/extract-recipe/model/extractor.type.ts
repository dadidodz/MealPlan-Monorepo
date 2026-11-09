import { RecipeCategory } from '../../recipe/model/recipe-category';

export type ExtractionStatus = 'idle' | 'loading' | 'success' | 'error' | 'already_exists';

export interface RecipeIngredient {
    name: string;
    quantity: number | null;
    unit: string | null;
}

export interface ExtractedRecipe {
    title: string;
    description?: string | null;
    basePortions: number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    category: RecipeCategory;
    sourceUrl?: string;
}

/** Answer of `POST /recipes/extract`. */
export type ExtractionStartResponse =
    { alreadyExists: true; recipeId: string } | { alreadyExists: false; jobId: string };

/** Message of the extraction stream (SSE), sent once when the job ends. `message` is not meant for users. */
export type ExtractionStreamEvent =
    | { status: 'success'; data: ExtractedRecipe }
    | { status: 'error'; code: string; message: string };

export type ExtractionResult =
    { type: 'extracted'; recipe: ExtractedRecipe } | { type: 'existing'; recipeId: string };
