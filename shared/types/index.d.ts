// Types shared by the API and the client, matching contracts/openapi.yaml (same names as its schemas).
// Declaration files only: nothing here exists at runtime, so neither layer needs to build this package.

/** Calendar day, `YYYY-MM-DD`, without time or time zone. */
export type CalendarDay = string;

export type MealType = 'LUNCH' | 'DINNER';

/** Dish type when it is distinctive, else the main ingredient. */
export type RecipeCategory =
    | 'meat'
    | 'poultry'
    | 'fish'
    | 'vegetarian'
    | 'stew'
    | 'salad'
    | 'soup'
    | 'pizza'
    | 'sandwich'
    | 'breakfast'
    | 'dessert'
    | 'drink'
    | 'other';

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
    /** Whole number, from 1 to 100. */
    peopleCount: number;
    recipe: {
        id: string;
        title: string;
    };
}

/** Body of `POST /planned-meals`. */
export interface CreatePlannedMeal {
    date: CalendarDay;
    mealType: MealType;
    recipeId: string;
    /** Whole number, from 1 to 100. */
    peopleCount: number;
}

/** A planned meal with its recipe (`POST /planned-meals`): quantities scaled to the meal's number of people. */
export interface PlannedMeal {
    id: string;
    date: CalendarDay;
    mealType: MealType;
    /** Whole number, from 1 to 100. */
    peopleCount: number;
    recipe: {
        id: string;
        title: string;
        category: RecipeCategory;
        imageUrl: string | null;
        /** Ordered steps. */
        instructions: string[];
        /** In recipe order. */
        ingredients: {
            ingredientId: string;
            name: string;
            /** Scaled to the meal, rounded to 2 decimals; null when the recipe gives none ("sel"). */
            quantity: number | null;
            unit: string | null;
        }[];
    };
}
