import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../testing/axe';
import { ApiRoutes } from '../../core/config/api.routes';
import { RecipeResponse } from '../../features/recipe/model/recipe.type';
import { ToastStore } from '../../shared/ui/toast-store';
import { RecipeEdit } from './recipe-edit';

@Component({ template: '' })
class RecipePageStub {}

const recipe: RecipeResponse = {
    id: '42',
    title: 'Velouté',
    description: 'Doux',
    basePortions: 4,
    instructions: ['Mixer'],
    sourceUrl: null,
    ingredients: [
        {
            ingredientId: 'i1',
            name: 'Sel',
            quantity: null,
            unit: null,
            isIgnoredInShoppingList: false,
        },
    ],
    category: 'soup',
    imageUrl: null,
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
};

describe('RecipeEdit', () => {
    let harness: RouterTestingHarness;
    let httpTesting: HttpTestingController;

    function page(): HTMLElement {
        const element = harness.routeNativeElement;
        if (!element) throw new Error('No routed page');
        return element;
    }

    function titleInput(): HTMLInputElement {
        const input = page().querySelector<HTMLInputElement>('input[type="text"]');
        if (!input) throw new Error('Title input not found');
        return input;
    }

    /** The form holding the editor: around it (page-owned form) or inside it. */
    async function submit(): Promise<void> {
        const editor = page().querySelector('app-recipe-editor');
        const form = editor?.closest('form') ?? editor?.querySelector('form');
        form?.dispatchEvent(new Event('submit', { cancelable: true }));
        await settle();
    }

    /** Not whenStable(): a pending request may keep the app unstable until it is flushed. */
    async function settle(): Promise<void> {
        for (let i = 0; i < 3; i++) {
            await Promise.resolve();
            TestBed.tick();
        }
    }

    function expectPatch(): ReturnType<HttpTestingController['expectOne']> {
        return httpTesting.expectOne({ method: 'PATCH', url: ApiRoutes.RECIPES.BY_ID('42') });
    }

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(
                    [
                        { path: 'recipes/:id/edit', component: RecipeEdit },
                        { path: 'recipes/:id', component: RecipePageStub },
                    ],
                    withComponentInputBinding(),
                ),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        harness = await RouterTestingHarness.create();
        await TestBed.inject(Router).navigateByUrl('/recipes/42/edit');
        await settle();
        httpTesting.expectOne({ method: 'GET', url: ApiRoutes.RECIPES.BY_ID('42') }).flush(recipe);
        await settle();
    });

    afterEach(() => httpTesting.verify());

    it('has no accessibility violations', async () => {
        expect(await axeViolations(page())).toEqual([]);
    });

    it('loads the recipe into the form', () => {
        expect(titleInput().value).toBe('Velouté');
    });

    it('sends null for a null quantity and unit saved unchanged', async () => {
        await submit();
        const patch = expectPatch();
        const body: unknown = patch.request.body;
        patch.flush(recipe);
        await harness.fixture.whenStable();

        expect(body).toMatchObject({
            ingredients: [{ name: 'Sel', quantity: null, unit: null }],
        });
    });

    it('saves, shows a toast and goes back to the recipe', async () => {
        await submit();
        expectPatch().flush(recipe);
        await settle(); // the submit action resumes and starts the navigation
        await harness.fixture.whenStable(); // nothing pending any more: lets the navigation finish

        expect(TestBed.inject(ToastStore).toasts()[0]?.type).toBe('success');
        expect(TestBed.inject(Router).url).toBe('/recipes/42');
    });

    it('keeps the values and shows an error when saving fails', async () => {
        titleInput().value = 'Velouté maison';
        titleInput().dispatchEvent(new Event('input'));
        await settle();

        await submit();
        expectPatch().flush(null, { status: 500, statusText: 'Server Error' });
        await settle();

        expect(TestBed.inject(ToastStore).toasts()[0]?.type).toBe('error');
        expect(TestBed.inject(Router).url).toBe('/recipes/42/edit');
        expect(titleInput().value).toBe('Velouté maison');
    });

    it('sends the save again after a failure, values unchanged', async () => {
        await submit();
        expectPatch().flush(null, { status: 500, statusText: 'Server Error' });
        await settle();

        await submit();
        expectPatch().flush(recipe);
        await settle();
        await harness.fixture.whenStable();

        expect(TestBed.inject(Router).url).toBe('/recipes/42');
    });
});

describe('RecipeEdit with an unknown recipe', () => {
    it('shows an error with a retry button', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(
                    [{ path: 'recipes/:id/edit', component: RecipeEdit }],
                    withComponentInputBinding(),
                ),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        const httpTesting = TestBed.inject(HttpTestingController);
        const harness = await RouterTestingHarness.create();
        await TestBed.inject(Router).navigateByUrl('/recipes/42/edit');
        TestBed.tick();

        httpTesting
            .expectOne(ApiRoutes.RECIPES.BY_ID('42'))
            .flush(null, { status: 404, statusText: 'Not Found' });
        await harness.fixture.whenStable();

        const text = harness.routeNativeElement?.textContent ?? '';
        expect(text).toContain('Élément introuvable.');
        expect(text).toContain('Réessayer');
        httpTesting.verify();
    });
});
