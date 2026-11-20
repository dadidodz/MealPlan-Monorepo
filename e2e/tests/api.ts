import type { APIRequestContext } from '@playwright/test';

/** Each test creates its own data through the API, never through the database: no order between tests. */
export const API_URL = 'http://localhost:3100/api';

export interface CreatedRecipe {
    id: string;
    title: string;
}

/** A recipe saved in the book; `title` should be unique to the test so it finds its own recipe. */
export async function createRecipe(request: APIRequestContext, title: string): Promise<CreatedRecipe> {
    const response = await request.post(`${API_URL}/recipes`, {
        data: {
            title,
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
        },
    });
    if (!response.ok()) throw new Error(`POST /recipes failed: ${response.status()} ${await response.text()}`);
    return (await response.json()) as CreatedRecipe;
}
