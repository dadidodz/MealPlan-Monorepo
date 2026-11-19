import type { PlannedMealsQuery } from '@mealplan/shared';
import { IsISO8601, Matches } from 'class-validator';
import { CALENDAR_DAY } from './calendar-day';

export class ListPlannedMealsQueryDto implements PlannedMealsQuery {
    @Matches(CALENDAR_DAY)
    @IsISO8601({ strict: true })
    from!: string;

    @Matches(CALENDAR_DAY)
    @IsISO8601({ strict: true })
    to!: string;
}
