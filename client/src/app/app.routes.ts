import { Routes } from '@angular/router';
import { DEV_ROUTES } from './dev-routes';

export const routes: Routes = [
    // 1. Default redirect (landing on the site root)
    {
        path: '',
        redirectTo: 'recipes',
        pathMatch: 'full',
    },

    // 2. Main page: the recipe book
    {
        path: 'recipes',
        title: 'Mon Carnet - MealPlan',
        loadComponent: () => import('./pages/recipe-book/recipe-book').then((m) => m.RecipeBook),
    },

    {
        path: 'recipes/:id', // ':id' is bound to the page's `id` input (withComponentInputBinding)
        title: 'Détails de la recette - MealPlan',
        loadComponent: () =>
            import('./pages/recipe-detail/recipe-detail').then((m) => m.RecipeDetail),
    },

    {
        path: 'recipes/:id/edit',
        title: 'Edition de la recette - MealPlan',
        loadComponent: () => import('./pages/recipe-edit/recipe-edit').then((m) => m.RecipeEdit),
    },

    // 3. The week's planned meals
    {
        path: 'planner',
        title: 'Planning - MealPlan',
        loadComponent: () => import('./pages/planner/planner').then((m) => m.Planner),
    },

    // 4. Dev only (/ui-kit): empty in production builds
    ...DEV_ROUTES,

    // 5. Fallback (wildcard): any unknown URL redirects to the recipe book
    {
        path: '**',
        redirectTo: 'recipes',
    },
];
