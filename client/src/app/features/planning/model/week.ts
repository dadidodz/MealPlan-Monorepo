import type { MealType, PlannedMealSummary } from '@mealplan/shared';

// Days are local `Date`s at midnight: building them from year, month and day keeps them right across clock changes.

const WEEK_FORMAT = /^(\d{4})-W(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
});
const RANGE_LABEL = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const SLOTS: readonly { mealType: MealType; label: string }[] = [
    { mealType: 'LUNCH', label: 'Midi' },
    { mealType: 'DINNER', label: 'Soir' },
];

export interface PlannerSlot {
    mealType: MealType;
    label: string;
    /** Undefined when the slot is empty. */
    meal: PlannedMealSummary | undefined;
}

export interface PlannerDay {
    date: string;
    label: string;
    slots: PlannerSlot[];
}

export function addDays(day: Date, days: number): Date {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
}

/** The Monday of the week containing this day. */
export function mondayOf(day: Date): Date {
    return addDays(day, -((day.getDay() + 6) % 7));
}

/** The ISO week containing this day (`2026-W45`): a week belongs to the year of its Thursday. */
export function isoWeekOf(day: Date): string {
    const thursday = addDays(mondayOf(day), 3);
    const year = thursday.getFullYear();
    const dayOfYear =
        (Date.UTC(year, thursday.getMonth(), thursday.getDate()) - Date.UTC(year, 0, 1)) /
        MS_PER_DAY;
    const week = Math.floor(dayOfYear / 7) + 1;
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/** The Monday of an ISO week; undefined if the value isn't a week that exists (`2026-W54`, `abc`). */
export function mondayOfIsoWeek(week: string | undefined): Date | undefined {
    const match = WEEK_FORMAT.exec(week ?? '');
    if (!match) return undefined;
    // January 4th is always in week 1
    const firstMonday = mondayOf(new Date(Number(match[1]), 0, 4));
    const monday = addDays(firstMonday, (Number(match[2]) - 1) * 7);
    return isoWeekOf(monday) === week ? monday : undefined;
}

/** `YYYY-MM-DD` of the local day. Not `toISOString()`: it converts to UTC, which is the day before in Paris at midnight. */
export function toDayString(day: Date): string {
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    return `${day.getFullYear()}-${month}-${date}`;
}

/** The week as a French range, such as "2 – 8 nov.". */
export function weekRangeLabel(monday: Date): string {
    return RANGE_LABEL.formatRange(monday, addDays(monday, 6));
}

/** Monday to Sunday, a lunch and a dinner slot per day, each with its meal if one is planned. */
export function toPlannerDays(monday: Date, meals: readonly PlannedMealSummary[]): PlannerDay[] {
    return Array.from({ length: 7 }, (_, index) => {
        const day = addDays(monday, index);
        const date = toDayString(day);
        return {
            date,
            label: DAY_LABEL.format(day),
            slots: SLOTS.map(({ mealType, label }) => ({
                mealType,
                label,
                meal: meals.find((meal) => meal.date === date && meal.mealType === mealType),
            })),
        };
    });
}
