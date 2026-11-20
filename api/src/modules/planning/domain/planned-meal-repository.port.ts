import { PlannedMeal } from './planned-meal.entity';

export const PLANNED_MEAL_REPOSITORY = Symbol('PlannedMealRepository');

export interface PlannedMealRepository {
    /**
     * Stores a new meal; an existing one is never replaced.
     * @throws SlotAlreadyTakenError if a meal is already planned on its slot.
     * @throws RecipeNotFoundError if its recipe doesn't exist.
     */
    add(meal: PlannedMeal): Promise<void>;
}
