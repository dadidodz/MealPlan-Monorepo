import { PlannedMealSummary } from '../domain/planned-meal-reader.port';
import { ScaledPlannedMeal } from '../domain/scale-quantity';
import { PlannedMealResponseDto } from './planned-meal-response.dto';
import { PlannedMealSummaryResponseDto } from './planned-meal-summary-response.dto';

function roundToTwoDecimals(quantity: number | null): number | null {
    return quantity === null ? null : Math.round(quantity * 100) / 100;
}

export class PlannedMealPresenter {
    static toSummaryResponse(meal: PlannedMealSummary): PlannedMealSummaryResponseDto {
        return {
            id: meal.id,
            date: meal.date.toString(),
            mealType: meal.mealType,
            peopleCount: meal.peopleCount,
            recipe: { id: meal.recipe.id, title: meal.recipe.title },
        };
    }

    static toResponse(meal: ScaledPlannedMeal): PlannedMealResponseDto {
        const { recipe } = meal;
        return {
            id: meal.id,
            date: meal.date.toString(),
            mealType: meal.mealType,
            peopleCount: meal.peopleCount,
            recipe: {
                id: recipe.id,
                title: recipe.title,
                category: recipe.category,
                imageUrl: recipe.imageUrl,
                instructions: recipe.instructions,
                ingredients: recipe.ingredients.map((ingredient) => ({
                    ingredientId: ingredient.ingredientId,
                    name: ingredient.name,
                    quantity: roundToTwoDecimals(ingredient.quantity),
                    unit: ingredient.unit,
                })),
            },
        };
    }
}
