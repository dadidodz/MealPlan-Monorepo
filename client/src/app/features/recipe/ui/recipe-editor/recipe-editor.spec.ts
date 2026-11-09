import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { axeViolations } from '../../../../../testing/axe';
import { hostElement } from '../../../../../testing/host-element';
import { ApiRoutes } from '../../../../core/config/api.routes';
import { Ingredient } from '../../../ingredient/model/ingredient.type';
import { recipeFormSchema } from '../../model/recipe-form.schema';
import { RecipeFormModel } from '../../model/recipe-form.type';
import { RecipeEditor } from './recipe-editor';

const recipe: RecipeFormModel = {
    title: 'Omelette',
    description: '',
    basePortions: 2,
    ingredients: [
        { name: '', quantity: 2, unit: '' },
        { name: '', quantity: 1, unit: '' },
    ],
    instructions: ['Battre les œufs'],
    category: 'other',
};

const tomato: Ingredient = { id: '1', name: 'tomate', code: 'tomate' };

/** Waits longer than the editor's 300 ms search debounce. */
const afterDebounce = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 350));

describe('RecipeEditor', () => {
    let fixture: ComponentFixture<RecipeEditor>;
    let httpTesting: HttpTestingController;
    let model: WritableSignal<RecipeFormModel>;

    /** Gives the editor a form over `value`, as the pages do. */
    async function render(value: RecipeFormModel): Promise<void> {
        model = signal(value);
        const recipeForm = TestBed.runInInjectionContext(() => form(model, recipeFormSchema));
        fixture.componentRef.setInput('recipeForm', recipeForm);
        await fixture.whenStable();
    }

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(RecipeEditor);
        await render(recipe);
    });

    afterEach(() => httpTesting.verify());

    it('has no accessibility violations', async () => {
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });

    function ingredientInput(row: number): HTMLInputElement {
        const input = hostElement(fixture).querySelectorAll<HTMLInputElement>(
            'input[placeholder="Nom de l\'ingrédient"]',
        )[row];
        if (!(input instanceof HTMLInputElement)) {
            throw new Error(`Ingredient name input ${row} not found`);
        }
        return input;
    }

    async function typeIngredient(term: string, row = 0): Promise<void> {
        const input = ingredientInput(row);
        input.value = term;
        input.dispatchEvent(new Event('input'));
        await afterDebounce();
    }

    function expectSearch(term: string): ReturnType<HttpTestingController['expectOne']> {
        return httpTesting.expectOne(
            (req) => req.url === ApiRoutes.INGREDIENTS.SEARCH && req.params.get('q') === term,
        );
    }

    describe('ingredient search', () => {
        it('searches after the debounce and shows the results', async () => {
            await typeIngredient('tom');
            expectSearch('tom').flush([tomato]);
            await fixture.whenStable();

            expect(hostElement(fixture).querySelector('ul')?.textContent).toContain('tomate');
        });

        it('does not search under 2 characters', async () => {
            await typeIngredient('t');
            // Matched on the path alone: a URL string would also compare the `?q=` parameter and never match
            expect(httpTesting.match((req) => req.url === ApiRoutes.INGREDIENTS.SEARCH)).toHaveLength(0);
        });

        it('stops the spinner and keeps searching after a failed search', async () => {
            await typeIngredient('tom');
            expectSearch('tom').flush('boom', { status: 500, statusText: 'Server Error' });
            await fixture.whenStable();
            expect(hostElement(fixture).querySelector('.loading')).toBeNull();

            await typeIngredient('tomat');
            expectSearch('tomat').flush([tomato]);
            await fixture.whenStable();
            expect(hostElement(fixture).querySelector('ul')?.textContent).toContain('tomate');
        });

        it('shows no spinner on another ingredient when the answer arrives after leaving the field', async () => {
            await typeIngredient('tom', 0);
            ingredientInput(0).dispatchEvent(new Event('blur'));
            ingredientInput(1).dispatchEvent(new Event('focus'));

            expectSearch('tom').flush([tomato]);
            await fixture.whenStable();

            expect(hostElement(fixture).querySelector('.loading')).toBeNull();
        });

        it('keeps the spinner of a pending search when an older answer for another field arrives', async () => {
            await typeIngredient('tom', 0);
            ingredientInput(0).dispatchEvent(new Event('blur'));
            const second = ingredientInput(1);
            second.dispatchEvent(new Event('focus'));
            second.value = 'ca';
            second.dispatchEvent(new Event('input'));

            // Field 1's answer arrives while field 2's search still waits for its debounce
            expectSearch('tom').flush([tomato]);
            await fixture.whenStable();
            expect(hostElement(fixture).querySelector('.loading')).not.toBeNull();

            await afterDebounce();
            expectSearch('ca').flush([]);
        });

        it("does not show another field's suggestions", async () => {
            await typeIngredient('tom', 0);
            expectSearch('tom').flush([tomato]);
            await fixture.whenStable();

            ingredientInput(0).dispatchEvent(new Event('blur'));
            ingredientInput(1).dispatchEvent(new Event('focus'));
            await fixture.whenStable();

            expect(hostElement(fixture).querySelector('ul')?.textContent ?? '').not.toContain(
                'tomate',
            );
        });

        it('searches again when coming back to a field that has 2+ characters', async () => {
            await typeIngredient('tom', 0);
            expectSearch('tom').flush([tomato]);
            ingredientInput(0).dispatchEvent(new Event('blur'));

            ingredientInput(0).dispatchEvent(new Event('focus'));
            await afterDebounce();
            expectSearch('tom').flush([tomato]);
            await fixture.whenStable();

            expect(hostElement(fixture).querySelector('ul')?.textContent).toContain('tomate');
        });
    });

    describe('category', () => {
        const validRecipe: RecipeFormModel = {
            title: 'Omelette',
            description: 'Rapide',
            basePortions: 2,
            ingredients: [{ name: 'Œuf', quantity: 2, unit: '' }],
            instructions: ['Battre les œufs'],
            category: 'breakfast',
        };

        function button(label: string): HTMLButtonElement {
            const found = [...hostElement(fixture).querySelectorAll('button')].find(
                (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
            );
            if (!(found instanceof HTMLButtonElement))
                throw new Error(`Button "${label}" not found`);
            return found;
        }

        beforeEach(async () => {
            await render(validRecipe);
        });

        it("shows the recipe's category on the picker button", () => {
            expect(button('Catégorie : Petit-déj')).toBeDefined();
        });

        it('saves the category picked in the grid', async () => {
            button('Catégorie : Petit-déj').click();
            await fixture.whenStable();
            button('Poisson').click();
            await fixture.whenStable();

            expect(button('Catégorie : Poisson')).toBeDefined();
            expect(model().category).toBe('fish');
        });

        it('keeps the category of the recipe when none is picked', () => {
            expect(model().category).toBe('breakfast');
        });
    });

    describe('lists', () => {
        function clickButton(label: string): void {
            const found = [...hostElement(fixture).querySelectorAll('button')].find(
                (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
            );
            if (!(found instanceof HTMLButtonElement))
                throw new Error(`Button "${label}" not found`);
            found.click();
        }

        it('adds an empty ingredient and removes one', async () => {
            clickButton('+ Ajouter un ingrédient');
            await fixture.whenStable();
            // toMatchObject: Signal Forms tags array items with a symbol key (not sent: JSON ignores symbols)
            expect(model().ingredients).toMatchObject([
                ...recipe.ingredients,
                { name: '', quantity: null, unit: '' },
            ]);

            clickButton("Supprimer l'ingrédient");
            await fixture.whenStable();
            expect(model().ingredients).toHaveLength(2);
        });

        it('adds an empty step and removes one', async () => {
            clickButton('+ Ajouter une étape');
            await fixture.whenStable();
            expect(model().instructions).toEqual(['Battre les œufs', '']);

            clickButton("Supprimer l'étape");
            await fixture.whenStable();
            expect(model().instructions).toEqual(['']);
        });

        it('fills the ingredient name with the picked suggestion, capitalised', async () => {
            await typeIngredient('tom');
            expectSearch('tom').flush([tomato]);
            await fixture.whenStable();

            hostElement(fixture).querySelector('ul a')?.dispatchEvent(new Event('mousedown'));
            await fixture.whenStable();

            expect(model().ingredients[0].name).toBe('Tomate');
        });
    });
});
