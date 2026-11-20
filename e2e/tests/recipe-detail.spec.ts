import { createRecipe, RECIPE_CONTENT } from './api';
import { expect, test } from './fixtures';

test('opens a recipe from the book and comes back', async ({ page, request }) => {
    // Setup through the API: in the app, a recipe can only come from the video import, which no test calls
    const recipe = await createRecipe(request, 'Gratin du parcours fiche');

    await page.goto('/');
    const card = page.getByRole('button', { name: recipe.title });
    await expect(card).toBeVisible();

    await card.tap();
    await expect(page).toHaveURL(`/recipes/${recipe.id}`);
    await expect(page.getByRole('heading', { level: 1, name: recipe.title })).toBeVisible();
    await expect(page.getByText(RECIPE_CONTENT.description)).toBeVisible();
    await expect(page.getByText('2 portions')).toBeVisible();

    // A <section> without a name has no "region" role: found by its heading
    const ingredients = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Ingrédients' }) });
    await expect(ingredients.getByRole('listitem').filter({ hasText: 'Pâtes' })).toContainText('200 g');
    await expect(ingredients.getByRole('listitem').filter({ hasText: 'Sauce tomate' })).toContainText('1 pot');
    for (const step of RECIPE_CONTENT.instructions) {
        await expect(page.getByText(step, { exact: true })).toBeVisible();
    }

    await page.getByRole('link', { name: 'Retour', exact: true }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Carnet de recettes' })).toBeVisible();
    await expect(card).toBeVisible();
});
