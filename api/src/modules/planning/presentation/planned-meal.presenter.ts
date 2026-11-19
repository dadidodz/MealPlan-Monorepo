/* eslint-disable @typescript-eslint/no-unused-vars -- red TDD commit: a skeleton whose bodies come with the green commit */
import { PlannedMealSummary } from '../domain/planned-meal-reader.port';
import { ScaledPlannedMeal } from '../domain/scale-quantity';
import { PlannedMealResponseDto } from './planned-meal-response.dto';
import { PlannedMealSummaryResponseDto } from './planned-meal-summary-response.dto';

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
        throw new Error('Not implemented');
    }
}
