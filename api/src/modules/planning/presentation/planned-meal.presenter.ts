import { PlannedMealSummary } from '../domain/planned-meal-reader.port';
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
}
