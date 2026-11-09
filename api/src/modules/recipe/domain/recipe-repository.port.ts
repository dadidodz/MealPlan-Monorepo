import { Recipe } from './recipe.entity';

export const RECIPE_REPOSITORY = Symbol('RecipeRepository');

export interface RecipeRepository {
    save(recipe: Recipe): Promise<void>;
    findById(id: string): Promise<Recipe | null>;
    findBySourceUrl(url: string): Promise<Recipe | null>;
}
