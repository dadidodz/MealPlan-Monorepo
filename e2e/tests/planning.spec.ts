import type { Page } from '@playwright/test';
import { createRecipe, dayOfThisWeek, planMeal, plannedMealsOn } from './api';
import { expect, test } from './fixtures';

// Each test plans its own slot of the current week: the tests can run in parallel on the same database
async function openThePlanner(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: 'Planning' }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Planning' })).toBeVisible();
}

test('plans a recipe on an empty slot', async ({ page, request }) => {
    // Setup through the API: in the app, a recipe can only come from the video import, which no test calls
    const recipe = await createRecipe(request, 'Curry du parcours planning');
    await openThePlanner(page);

    await page.getByRole('button', { name: /^Planifier le soir du lundi/ }).tap();
    const dialog = page.getByRole('dialog', { name: /^Planifier le soir du lundi/ });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: recipe.title }).tap();
    await expect(dialog.getByText(recipe.title)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Changer de recette' })).toBeVisible();
    const people = dialog.getByLabel('Nombre de personnes');
    await expect(people).toHaveValue('2'); // the recipe's portions

    await people.fill('4');
    await dialog.getByRole('button', { name: 'Planifier', exact: true }).tap();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Repas planifié.')).toBeVisible();
    const monday = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: /^lundi/ }) });
    await expect(monday.getByText(recipe.title)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Planifier le soir du lundi/ })).toHaveCount(0);

    // Not shown in the week: checked in what the API saved
    const saved = await plannedMealsOn(request, dayOfThisWeek(0));
    expect(saved).toEqual([expect.objectContaining({ mealType: 'DINNER', peopleCount: 4 })]);
});

test('tells the user the slot was just taken and shows the meal planned instead', async ({ page, request }) => {
    const mine = await createRecipe(request, 'Salade du créneau disputé');
    const theirs = await createRecipe(request, 'Soupe planifiée ailleurs');
    await openThePlanner(page);

    await page.getByRole('button', { name: /^Planifier le midi du mardi/ }).tap();
    const dialog = page.getByRole('dialog', { name: /^Planifier le midi du mardi/ });
    await dialog.getByRole('button', { name: mine.title }).tap();
    await expect(dialog.getByLabel('Nombre de personnes')).toHaveValue('2');

    // Meanwhile, the same slot is planned from another phone
    await planMeal(request, { date: dayOfThisWeek(1), mealType: 'LUNCH', recipeId: theirs.id, peopleCount: 3 });
    await dialog.getByRole('button', { name: 'Planifier', exact: true }).tap();

    await expect(page.getByText("Ce créneau vient d'être pris.")).toBeVisible();
    await expect(dialog).toBeHidden();
    const tuesday = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: /^mardi/ }) });
    await expect(tuesday.getByText(theirs.title)).toBeVisible();
    await expect(tuesday.getByText(mine.title)).toHaveCount(0);
});
