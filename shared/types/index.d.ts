// Types shared by the API and the client, matching contracts/openapi.yaml (same names as its schemas).
// Declaration files only: nothing here exists at runtime, so neither layer needs to build this package.

/** Calendar day, `YYYY-MM-DD`, without time or time zone. */
export type CalendarDay = string;

export type MealType = 'LUNCH' | 'DINNER';

/** Query of `GET /planned-meals`: both days included. */
export interface PlannedMealsQuery {
    from: CalendarDay;
    to: CalendarDay;
}

/** A planned meal in a list (`GET /planned-meals`). */
export interface PlannedMealSummary {
    id: string;
    date: CalendarDay;
    mealType: MealType;
    /** Whole number, 1 or more. */
    peopleCount: number;
    recipe: {
        id: string;
        title: string;
    };
}
