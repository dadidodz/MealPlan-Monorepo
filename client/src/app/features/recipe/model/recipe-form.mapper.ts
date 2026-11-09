import { ExtractedRecipe } from '../../extract-recipe/model/extractor.type';
import { RecipeFormModel } from './recipe-form.type';
import { RecipePayload, RecipeResponse } from './recipe.type';

/** A saved recipe, ready to edit. */
export function toFormModel(recipe: RecipeResponse): RecipeFormModel {
    return {
        title: recipe.title,
        description: recipe.description ?? '',
        basePortions: recipe.basePortions,
        category: recipe.category,
        ingredients: recipe.ingredients.map((ingredient) => ({
            name: capitalize(ingredient.name),
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? '',
        })),
        instructions: [...recipe.instructions],
    };
}

/** A draft written by the AI, ready to review. */
export function draftToFormModel(draft: ExtractedRecipe): RecipeFormModel {
    return {
        title: draft.title,
        description: draft.description ?? '',
        basePortions: draft.basePortions,
        category: draft.category,
        ingredients: draft.ingredients.map((ingredient) => ({
            name: capitalize(ingredient.name),
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? '',
        })),
        instructions: [...draft.instructions],
    };
}

/** Empty text goes back to `null`: "no unit" must not be saved as a unit. */
export function toPayload(model: RecipeFormModel): RecipePayload {
    return {
        title: model.title,
        description: model.description.trim() === '' ? null : model.description,
        basePortions: model.basePortions,
        category: model.category,
        ingredients: model.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit === '' ? null : ingredient.unit,
        })),
        instructions: [...model.instructions],
    };
}

/** "œufs" → "Œufs": ingredient names are shown and saved with a capital. */
export function capitalize(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}
