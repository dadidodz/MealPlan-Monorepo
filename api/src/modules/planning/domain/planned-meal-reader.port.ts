import { Temporal } from '@js-temporal/polyfill';
import { RecipeCategory } from '../../recipe/domain/recipe-category';
import { MealType } from './planned-meal.entity';

export const PLANNED_MEAL_READER = Symbol('PlannedMealReader');

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

/** A planned meal with its recipe as stored: quantities are for `basePortions`, not for the meal. */
export interface PlannedMealDetails {
    id: string;
    date: Temporal.PlainDate;
    mealType: MealType;
    peopleCount: number;
    recipe: {
        id: string;
        title: string;
        category: RecipeCategory;
        imageUrl: string | null;
        basePortions: number;
        instructions: string[];
        /** In recipe order. */
        ingredients: {
            ingredientId: string;
            name: string;
            quantity: number | null;
            unit: string | null;
        }[];
    };
}

export interface PlannedMealReader {
    /** Both days included, sorted by date, then lunch before dinner. */
    listBetween(from: Temporal.PlainDate, to: Temporal.PlainDate): Promise<PlannedMealSummary[]>;

    /** @throws PlannedMealNotFoundError if no meal has this id. */
    getDetails(id: string): Promise<PlannedMealDetails>;
}
