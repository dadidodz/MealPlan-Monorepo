import type { CalendarDay, CreatePlannedMeal, PlannedMealSummary } from '@mealplan/shared';
import type { APIRequestContext } from '@playwright/test';

/** Each test creates its own data through the API, never through the database: no order between tests. */
export const API_URL = 'http://localhost:3100/api';

/** What every recipe created by `createRecipe()` contains, besides its title. */
export const RECIPE_CONTENT = {
    description: 'Recette créée par un test E2E',
    basePortions: 2,
    instructions: ['Cuire les pâtes', 'Ajouter la sauce'],
    sourceUrl: null,
    imageUrl: null,
    category: 'vegetarian',
    ingredients: [
        { name: 'Pâtes', quantity: 200, unit: 'g' },
        { name: 'Sauce tomate', quantity: 1, unit: 'pot' },
    ],
};

export interface CreatedRecipe {
    id: string;
    title: string;
}

/** A recipe saved in the book; `title` should be unique to the test so it finds its own recipe. */
export async function createRecipe(request: APIRequestContext, title: string): Promise<CreatedRecipe> {
    const response = await request.post(`${API_URL}/recipes`, { data: { title, ...RECIPE_CONTENT } });
    if (!response.ok()) throw new Error(`POST /recipes failed: ${response.status()} ${await response.text()}`);
    return (await response.json()) as CreatedRecipe;
}

/** A meal planned by someone else (another phone), behind the page's back. */
export async function planMeal(request: APIRequestContext, meal: CreatePlannedMeal): Promise<void> {
    const response = await request.post(`${API_URL}/planned-meals`, { data: meal });
    if (!response.ok()) throw new Error(`POST /planned-meals failed: ${response.status()} ${await response.text()}`);
}

/** What the API saved for the given day; the week view doesn't show everything (e.g. the number of people). */
export async function plannedMealsOn(request: APIRequestContext, day: CalendarDay): Promise<PlannedMealSummary[]> {
    const response = await request.get(`${API_URL}/planned-meals`, { params: { from: day, to: day } });
    if (!response.ok()) throw new Error(`GET /planned-meals failed: ${response.status()}`);
    return (await response.json()) as PlannedMealSummary[];
}

/** A day of the current week (0 = Monday) as `YYYY-MM-DD`, in the same time zone as the browser. */
export function dayOfThisWeek(index: number): CalendarDay {
    const day = new Date();
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7) + index);
    return day.toLocaleDateString('sv-SE'); // the Swedish format is YYYY-MM-DD
}
