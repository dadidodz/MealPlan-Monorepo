import { Temporal } from '@js-temporal/polyfill';
import { PlannedMealReader, PlannedMealSummary } from './planned-meal-reader.port';

const MEAL_ORDER = ['LUNCH', 'DINNER'];

/** Reads the meals it is given, sorted like the Prisma reader. */
export class InMemoryPlannedMealReader implements PlannedMealReader {
    constructor(private readonly meals: PlannedMealSummary[]) {}

    listBetween(from: Temporal.PlainDate, to: Temporal.PlainDate): Promise<PlannedMealSummary[]> {
        const meals = this.meals
            .filter(
                ({ date }) =>
                    Temporal.PlainDate.compare(date, from) >= 0 &&
                    Temporal.PlainDate.compare(date, to) <= 0,
            )
            .sort(
                (a, b) =>
                    Temporal.PlainDate.compare(a.date, b.date) ||
                    MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType),
            );
        return Promise.resolve(meals);
    }
}
