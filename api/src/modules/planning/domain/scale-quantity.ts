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
    return quantity === null ? null : (quantity * peopleCount) / basePortions;
}

/** A planned meal with its quantities for the meal's number of people. */
export type ScaledPlannedMeal = Omit<PlannedMealDetails, 'recipe'> & {
    recipe: Omit<PlannedMealDetails['recipe'], 'basePortions'>;
};

export function scalePlannedMeal(meal: PlannedMealDetails): ScaledPlannedMeal {
    const { basePortions, ...recipe } = meal.recipe;
    return {
        ...meal,
        recipe: {
            ...recipe,
            ingredients: recipe.ingredients.map((ingredient) => ({
                ...ingredient,
                quantity: scaleQuantity(ingredient.quantity, meal.peopleCount, basePortions),
            })),
        },
    };
}
