import { Temporal } from '@js-temporal/polyfill';
import { RecipeCategory } from './recipe-category';

export const RECIPE_READER = Symbol('RecipeReader');

/** A recipe as shown in the recipe book list (no ingredients, no instructions). */
export interface RecipeSummary {
    id: string;
    title: string;
    description: string | null;
    basePortions: number;
    category: RecipeCategory;
    imageUrl: string | null;
    createdAt: Temporal.Instant;
    updatedAt: Temporal.Instant;
}

export interface RecipeReader {
    /** Newest first. */
    list(page: { limit: number; offset: number }): Promise<RecipeSummary[]>;
}
