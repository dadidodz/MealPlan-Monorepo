import { Temporal } from '@js-temporal/polyfill';

export const PLANNED_MEAL_READER = Symbol('PlannedMealReader');

export type MealType = 'LUNCH' | 'DINNER';

/** A planned meal as shown in the week view. */
export interface PlannedMealSummary {
    id: string;
    date: Temporal.PlainDate;
    mealType: MealType;
    peopleCount: number;
    recipe: {
        id: string;
        title: string;
    };
}

export interface PlannedMealReader {
    /** Both days included, sorted by date, then lunch before dinner. */
    listBetween(from: Temporal.PlainDate, to: Temporal.PlainDate): Promise<PlannedMealSummary[]>;
}
