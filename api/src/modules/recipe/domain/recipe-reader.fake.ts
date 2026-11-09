import { Temporal } from '@js-temporal/polyfill';
import { RecipeReader, RecipeSummary } from './recipe-reader.port';
import { InMemoryRecipeRepository } from './recipe-repository.fake';

/** Reads the recipes saved in an in-memory repository, newest first like the Prisma reader. */
export class InMemoryRecipeReader implements RecipeReader {
    constructor(private readonly recipes: InMemoryRecipeRepository) {}

    list(page: { limit: number; offset: number }): Promise<RecipeSummary[]> {
        const summaries = [...this.recipes.recipes.values()]
            .sort((a, b) => Temporal.Instant.compare(b.createdAt, a.createdAt))
            .slice(page.offset, page.offset + page.limit)
            .map(({ id, title, description, category, imageUrl, createdAt, updatedAt }) => ({
                id,
                title,
                description,
                category,
                imageUrl,
                createdAt,
                updatedAt,
            }));
        return Promise.resolve(summaries);
    }
}
