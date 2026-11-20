import { createRecipe } from './api';
import { expect, test } from './fixtures';

test('opens on the recipe book', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/recipes$/);
    await expect(page).toHaveTitle('Mon Carnet - MealPlan');
});

test('shows in the book a recipe saved through the API', async ({ page, request }) => {
    const recipe = await createRecipe(request, 'Pâtes du test de démarrage');

    await page.goto('/recipes');

    await expect(page.getByText(recipe.title)).toBeVisible();
});
