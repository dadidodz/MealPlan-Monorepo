import { Temporal } from '@js-temporal/polyfill';
import { InvalidPlannedMealError } from './invalid-planned-meal.error';
import { NewPlannedMeal, PlannedMeal } from './planned-meal.entity';

const dinner: NewPlannedMeal = {
    date: Temporal.PlainDate.from('2026-11-02'),
    mealType: 'DINNER',
    recipeId: 'recipe-1',
    peopleCount: 4,
};

describe('PlannedMeal', () => {
    it('creates a meal with what it was given and a new id', () => {
        const meal = PlannedMeal.create(dinner);

        expect(meal.id).toEqual(expect.any(String));
        expect(meal.id).not.toBe(PlannedMeal.create(dinner).id);
        expect(meal.date.toString()).toBe('2026-11-02');
        expect(meal.mealType).toBe('DINNER');
        expect(meal.recipeId).toBe('recipe-1');
        expect(meal.peopleCount).toBe(4);
    });

    it.each([1, 100])('accepts %s people', (peopleCount) => {
        expect(PlannedMeal.create({ ...dinner, peopleCount }).peopleCount).toBe(peopleCount);
    });

    it.each([0, -1, 1.5, 101])('refuses %s people', (peopleCount) => {
        expect(() => PlannedMeal.create({ ...dinner, peopleCount })).toThrow(
            InvalidPlannedMealError,
        );
    });

    it('restores a meal from storage without checking it', () => {
        const meal = PlannedMeal.restore({ ...dinner, id: 'meal-1', peopleCount: 101 });

        expect(meal.id).toBe('meal-1');
        expect(meal.peopleCount).toBe(101);
    });
});
