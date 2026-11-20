import { expect, test } from './fixtures';

test('moves between the book and the planner with the bottom navigation', async ({ page }) => {
    const bottomNav = page.getByRole('navigation', { name: 'Navigation mobile' });
    const days = page.getByRole('main').getByRole('heading', { level: 2 });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Carnet de recettes' })).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Planning' }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Planning' })).toBeVisible();
    await expect(days).toHaveCount(7);
    await expect(page.getByRole('link', { name: 'Semaine précédente' })).toBeVisible();

    const firstDayOfThisWeek = await days.first().textContent();
    await page.getByRole('link', { name: 'Semaine suivante' }).tap();
    await expect(days.first()).not.toHaveText(firstDayOfThisWeek ?? '');
    await expect(days).toHaveCount(7);

    await bottomNav.getByRole('link', { name: 'Carnet' }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Carnet de recettes' })).toBeVisible();
});
