import { Temporal } from '@js-temporal/polyfill';
import { InvalidDateRangeError } from '../domain/invalid-date-range.error';
import { InMemoryPlannedMealReader } from '../domain/planned-meal-reader.fake';
import { MealType, PlannedMealSummary } from '../domain/planned-meal-reader.port';
import { ListPlannedMealsUseCase } from './list-planned-meals.use-case';

function aMeal(date: string, mealType: MealType): PlannedMealSummary {
    return {
        id: `${date}-${mealType}`,
        date: Temporal.PlainDate.from(date),
        mealType,
        peopleCount: 2,
        recipe: { id: 'recipe-1', title: 'Burger maison' },
    };
}

const day = (date: string): Temporal.PlainDate => Temporal.PlainDate.from(date);

describe('ListPlannedMealsUseCase', () => {
    const useCase = new ListPlannedMealsUseCase(
        new InMemoryPlannedMealReader([
            aMeal('2026-11-03', 'DINNER'),
            aMeal('2026-11-03', 'LUNCH'),
            aMeal('2026-11-01', 'DINNER'),
            aMeal('2026-11-02', 'LUNCH'),
            aMeal('2026-11-08', 'DINNER'),
            aMeal('2026-11-09', 'LUNCH'),
        ]),
    );

    it('returns the meals of the range, both days included, by date then lunch first', async () => {
        const meals = await useCase.execute(day('2026-11-02'), day('2026-11-08'));

        expect(meals.map((meal) => meal.id)).toEqual([
            '2026-11-02-LUNCH',
            '2026-11-03-LUNCH',
            '2026-11-03-DINNER',
            '2026-11-08-DINNER',
        ]);
    });

    it('accepts a range of one day', async () => {
        const meals = await useCase.execute(day('2026-11-02'), day('2026-11-02'));

        expect(meals).toHaveLength(1);
    });

    it('returns nothing for a range with no meal', async () => {
        expect(await useCase.execute(day('2027-01-01'), day('2027-01-07'))).toEqual([]);
    });

    it('refuses a range where from is after to', async () => {
        await expect(useCase.execute(day('2026-11-08'), day('2026-11-02'))).rejects.toThrow(
            new InvalidDateRangeError(day('2026-11-08'), day('2026-11-02')),
        );
    });
});
