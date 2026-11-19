/* eslint-disable @typescript-eslint/no-unused-vars -- red TDD commit: a skeleton whose bodies come with the green commit */
import { PlannedMealDetails } from './planned-meal-reader.port';

/**
 * A recipe quantity for a meal's number of people: quantity × people ÷ base portions. Not rounded: the shopping list
 * sums these values first, and responses round them. An ingredient without a quantity ("sel") stays without one.
 */
export function scaleQuantity(
    quantity: number | null,
    peopleCount: number,
    basePortions: number,
): number | null {
    throw new Error('Not implemented');
}

/** A planned meal with its quantities for the meal's number of people. */
export type ScaledPlannedMeal = Omit<PlannedMealDetails, 'recipe'> & {
    recipe: Omit<PlannedMealDetails['recipe'], 'basePortions'>;
};

export function scalePlannedMeal(meal: PlannedMealDetails): ScaledPlannedMeal {
    throw new Error('Not implemented');
}
