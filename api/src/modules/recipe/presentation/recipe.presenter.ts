import { Recipe } from '../domain/recipe.entity';
import { ExtractedRecipeDraft } from '../domain/recipe-analyzer.port';
import { RecipeSummary } from '../domain/recipe-reader.port';
import { ExtractedRecipeDraftResponseDto } from './extracted-recipe-draft-response.dto';
import { RecipeSummaryResponseDto } from './recipe-summary-response.dto';
import { RecipeIngredientResponseDto, RecipeResponseDto } from './recipe-response.dto';

export class RecipePresenter {
    static toResponse(recipe: Recipe): RecipeResponseDto {
        const ingredientsDto: RecipeIngredientResponseDto[] = recipe.ingredients.map(
            (ingredient) => ({
                ingredientId: ingredient.ingredientId,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                isIgnoredInShoppingList: ingredient.isIgnoredInShoppingList,
            }),
        );

        return {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            basePortions: recipe.basePortions,
            instructions: [...recipe.instructions],
            sourceUrl: recipe.aiExtraction?.sourceUrl ?? null,
            ingredients: ingredientsDto,
            category: recipe.category,
            imageUrl: recipe.imageUrl,
            createdAt: recipe.createdAt.toString(),
            updatedAt: recipe.updatedAt.toString(),
        };
    }

    static toSummaryResponse(recipe: RecipeSummary): RecipeSummaryResponseDto {
        return {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            basePortions: recipe.basePortions,
            category: recipe.category,
            imageUrl: recipe.imageUrl,
            createdAt: recipe.createdAt.toString(),
            updatedAt: recipe.updatedAt.toString(),
        };
    }

    static toDraftResponse(draft: ExtractedRecipeDraft): ExtractedRecipeDraftResponseDto {
        return {
            title: draft.title,
            description: draft.description,
            basePortions: draft.basePortions,
            instructions: [...draft.instructions],
            ingredients: draft.ingredients.map(({ name, quantity, unit }) => ({
                name,
                quantity,
                unit,
            })),
            category: draft.category,
            ...(draft.sourceUrl !== undefined && { sourceUrl: draft.sourceUrl }),
        };
    }
}
