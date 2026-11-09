import { Routes } from '@angular/router';

/**
 * Routes only served in development. The production build replaces this file with `dev-routes.prod.ts`
 * (`fileReplacements` in angular.json), so their code never ships.
 */
export const DEV_ROUTES: Routes = [
    {
        path: 'ui-kit',
        title: 'UI kit - MealPlan',
        loadComponent: () => import('./pages/ui-kit/ui-kit').then((m) => m.UiKitPage),
    },
];
