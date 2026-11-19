import { Temporal } from '@js-temporal/polyfill';
import { ScaledPlannedMeal } from '../domain/scale-quantity';
import { PlannedMealPresenter } from './planned-meal.presenter';

function aMealWith(quantity: number | null): ScaledPlannedMeal {
    return {
        id: 'meal-1',
        date: Temporal.PlainDate.from('2026-11-02'),
        mealType: 'DINNER',
        peopleCount: 1,
        recipe: {
            id: 'recipe-1',
            title: 'Burger maison',
            category: 'meat',
            imageUrl: null,
            instructions: [],
            ingredients: [{ ingredientId: 'bun', name: 'pain', quantity, unit: 'pièce' }],
        },
    };
}

describe('PlannedMealPresenter', () => {
    it.each([
        [100 / 3, 33.33],
        [200 / 3, 66.67],
        [1.5, 1.5],
        [4, 4],
        [null, null],
    ])('rounds a quantity of %s to %s in the response', (quantity, expected) => {
        const response = PlannedMealPresenter.toResponse(aMealWith(quantity));

        expect(response.recipe.ingredients[0]?.quantity).toBe(expected);
    });

    it('writes the day as a calendar day', () => {
        expect(PlannedMealPresenter.toResponse(aMealWith(1)).date).toBe('2026-11-02');
    });
});
