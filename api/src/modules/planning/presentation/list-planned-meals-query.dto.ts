import type { PlannedMealsQuery } from '@mealplan/shared';
import { IsISO8601, Matches } from 'class-validator';

// IsISO8601 alone also accepts a time or `2026-W45-1`. PostgreSQL has no year 0, hence the first digit.
const CALENDAR_DAY = /^[1-9]\d{3}-\d{2}-\d{2}$/;

export class ListPlannedMealsQueryDto implements PlannedMealsQuery {
    @Matches(CALENDAR_DAY)
    @IsISO8601({ strict: true })
    from!: string;

    @Matches(CALENDAR_DAY)
    @IsISO8601({ strict: true })
    to!: string;
}
