import type { CreatePlannedMeal, MealType } from '@mealplan/shared';
import { IsIn, IsInt, IsISO8601, IsUUID, Matches, Max, Min } from 'class-validator';
import { CALENDAR_DAY } from './calendar-day';

const MEAL_TYPES: readonly MealType[] = ['LUNCH', 'DINNER'];

export class CreatePlannedMealDto implements CreatePlannedMeal {
    @Matches(CALENDAR_DAY)
    @IsISO8601({ strict: true })
    date!: string;

    @IsIn(MEAL_TYPES)
    mealType!: MealType;

    @IsUUID()
    recipeId!: string;

    @IsInt()
    @Min(1)
    @Max(100)
    peopleCount!: number;
}
