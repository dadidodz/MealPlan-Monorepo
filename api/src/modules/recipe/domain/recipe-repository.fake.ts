import { Temporal } from '@js-temporal/polyfill';
import { Recipe, RecipeProps } from './recipe.entity';
import { RecipeRepository } from './recipe-repository.port';

export class InMemoryRecipeRepository implements RecipeRepository {
    readonly recipes = new Map<string, Recipe>();

    save(recipe: Recipe): Promise<void> {
        this.recipes.set(recipe.id, recipe);
        return Promise.resolve();
    }

    findById(id: string): Promise<Recipe | null> {
        return Promise.resolve(this.recipes.get(id) ?? null);
    }

    findBySourceUrl(url: string): Promise<Recipe | null> {
        const found = [...this.recipes.values()].find((r) => r.aiExtraction?.sourceUrl === url);
        return Promise.resolve(found ?? null);
    }
}

/** A valid recipe for tests; `changes` overrides any field. */
export function aRecipe(changes: Partial<RecipeProps> = {}): Recipe {
    const createdAt = Temporal.Instant.from('2026-01-01T10:00:00Z');
    return Recipe.restore({
        id: crypto.randomUUID(),
        title: 'Tarte',
        description: null,
        basePortions: 4,
        instructions: ['Cuire 30 min'],
        aiExtraction: null,
        ingredients: [],
        category: 'dessert',
        imageUrl: null,
        createdAt,
        updatedAt: createdAt,
        ...changes,
    });
}
