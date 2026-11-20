import { test as base, expect } from '@playwright/test';

/**
 * Every test's page refuses the import from a video: a click on it by mistake never starts yt-dlp or Gemini.
 * Import from this file, never from '@playwright/test'.
 */
export const test = base.extend({
    page: async ({ page }, use) => {
        await page.route('**/api/recipes/extract**', (route) => route.abort('blockedbyclient'));
        await use(page);
    },
});

export { expect };
