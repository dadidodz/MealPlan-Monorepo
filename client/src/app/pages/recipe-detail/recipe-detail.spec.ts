import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../testing/axe';
import { hostElement } from '../../../testing/host-element';
import { ApiRoutes } from '../../core/config/api.routes';
import { RecipeResponse } from '../../features/recipe/model/recipe.type';
import { RecipeDetail } from './recipe-detail';

const recipe: RecipeResponse = {
    id: '42',
    title: 'Velouté de potiron',
    description: 'Doux et crémeux',
    basePortions: 4,
    instructions: ['Couper le potiron', 'Mixer'],
    sourceUrl: null,
    ingredients: [
        {
            ingredientId: 'ing-1',
            name: 'Potiron',
            quantity: 500,
            unit: 'g',
            isIgnoredInShoppingList: false,
        },
        {
            ingredientId: 'ing-2',
            name: 'échalote',
            quantity: 1,
            unit: null,
            isIgnoredInShoppingList: false,
        },
        {
            ingredientId: 'ing-3',
            name: 'Crème',
            quantity: 20,
            unit: 'cl',
            isIgnoredInShoppingList: false,
        },
    ],
    category: 'soup',
    imageUrl: null,
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
};

describe('RecipeDetail', () => {
    let harness: RouterTestingHarness;
    let httpTesting: HttpTestingController;

    function text(): string {
        return harness.routeNativeElement?.textContent ?? '';
    }

    /** Ingredient names in display order. */
    function ingredientNames(): string[] {
        const items = harness.routeNativeElement?.querySelectorAll('ul li span:first-child') ?? [];
        return Array.from(items, (item) => item.textContent?.trim() ?? '');
    }

    function orderButton(label: string): HTMLButtonElement | undefined {
        const buttons = harness.routeNativeElement?.querySelectorAll('button') ?? [];
        return Array.from(buttons).find((button) => button.textContent?.trim() === label);
    }

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(
                    [{ path: 'recipes/:id', component: RecipeDetail }],
                    withComponentInputBinding(),
                ),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        harness = await RouterTestingHarness.create();
        // Not harness.navigateByUrl(): it waits for stability, and a pending httpResource request prevents it
        await TestBed.inject(Router).navigateByUrl('/recipes/42');
        TestBed.tick();
    });

    afterEach(() => httpTesting.verify());

    it('has no accessibility violations once the recipe is shown', async () => {
        httpTesting.expectOne(ApiRoutes.RECIPES.BY_ID('42')).flush(recipe);
        await harness.fixture.whenStable();
        expect(await axeViolations(hostElement(harness.fixture))).toEqual([]);
    });

    it('shows a skeleton, then the recipe of the route id', async () => {
        expect(harness.routeNativeElement?.querySelector('.animate-pulse')).not.toBeNull();

        httpTesting.expectOne(ApiRoutes.RECIPES.BY_ID('42')).flush(recipe);
        await harness.fixture.whenStable();

        expect(text()).toContain('Velouté de potiron');
        expect(text()).toContain('Potiron');
        expect(text()).toContain('500 g');
        expect(text()).toContain('Mixer');
        expect(text()).toContain('Éditer');
    });

    it('shows an error with a retry button when the recipe does not exist', async () => {
        httpTesting
            .expectOne(ApiRoutes.RECIPES.BY_ID('42'))
            .flush(null, { status: 404, statusText: 'Not Found' });
        await harness.fixture.whenStable();

        expect(text()).toContain('Élément introuvable.');
        expect(text()).toContain('Réessayer');
        expect(text()).not.toContain('Éditer');
    });

    it('lists the ingredients in the recipe order by default', async () => {
        httpTesting.expectOne(ApiRoutes.RECIPES.BY_ID('42')).flush(recipe);
        await harness.fixture.whenStable();

        expect(ingredientNames()).toEqual(['Potiron', 'échalote', 'Crème']);
    });

    it('lists the ingredients from A to Z, accents ignored, and back to the recipe order', async () => {
        httpTesting.expectOne(ApiRoutes.RECIPES.BY_ID('42')).flush(recipe);
        await harness.fixture.whenStable();

        orderButton('A→Z')?.click();
        await harness.fixture.whenStable();
        expect(ingredientNames()).toEqual(['Crème', 'échalote', 'Potiron']);
        expect(orderButton('A→Z')?.getAttribute('aria-pressed')).toBe('true');

        orderButton('Ordre de la recette')?.click();
        await harness.fixture.whenStable();
        expect(ingredientNames()).toEqual(['Potiron', 'échalote', 'Crème']);
    });
});
