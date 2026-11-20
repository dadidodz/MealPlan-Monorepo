import { RecipeNotFoundError } from '../../recipe/domain/recipe-not-found.error';
import { PlannedMeal } from './planned-meal.entity';
import { PlannedMealRepository } from './planned-meal-repository.port';
import { SlotAlreadyTakenError } from './slot-already-taken.error';

/** Keeps the meals in memory and refuses what the database would. */
export class InMemoryPlannedMealRepository implements PlannedMealRepository {
    readonly meals: PlannedMeal[] = [];

    constructor(private readonly recipeIds: string[]) {}

    add(meal: PlannedMeal): Promise<void> {
        const taken = this.meals.some(
            ({ date, mealType }) => date.equals(meal.date) && mealType === meal.mealType,
        );
        if (taken) return Promise.reject(new SlotAlreadyTakenError(meal.date, meal.mealType));
        if (!this.recipeIds.includes(meal.recipeId)) {
            return Promise.reject(new RecipeNotFoundError(meal.recipeId));
        }
        this.meals.push(meal);
        return Promise.resolve();
    }
}
