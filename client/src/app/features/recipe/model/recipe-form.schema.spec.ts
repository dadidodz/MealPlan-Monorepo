import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, form } from '@angular/forms/signals';
import { recipeFormSchema } from './recipe-form.schema';
import { RecipeFormModel } from './recipe-form.type';

const valid: RecipeFormModel = {
    title: 'Velouté',
    description: '',
    basePortions: 4,
    category: 'soup',
    ingredients: [{ name: 'Potiron', quantity: null, unit: '' }],
    instructions: ['Mixer'],
};

function recipeForm(changes: Partial<RecipeFormModel> = {}): FieldTree<RecipeFormModel> {
    return TestBed.runInInjectionContext(() =>
        form(signal({ ...valid, ...changes }), recipeFormSchema),
    );
}

function messages(field: FieldTree<unknown>): (string | undefined)[] {
    return field()
        .errors()
        .map((error) => error.message);
}

describe('recipeFormSchema', () => {
    it('accepts a recipe without description, quantity or unit', () => {
        expect(recipeForm()().valid()).toBe(true);
    });

    it.each(['', '   '])('refuses the blank title %j', (title) => {
        expect(messages(recipeForm({ title }).title)).toEqual(['Le titre est obligatoire.']);
    });

    it.each([0, 1.5, -2])('refuses %d base portions', (basePortions) => {
        expect(messages(recipeForm({ basePortions }).basePortions)).toEqual([
            'Un nombre entier de portions, au moins 1.',
        ]);
    });

    it('refuses an ingredient without a name', () => {
        const ingredients = [{ name: ' ', quantity: 2, unit: 'g' }];
        expect(messages(recipeForm({ ingredients }).ingredients[0].name)).toEqual([
            "Le nom de l'ingrédient est obligatoire.",
        ]);
    });

    it('refuses a negative quantity', () => {
        const ingredients = [{ name: 'Sel', quantity: -1, unit: '' }];
        expect(messages(recipeForm({ ingredients }).ingredients[0].quantity)).toEqual([
            'La quantité ne peut pas être négative.',
        ]);
    });

    it('refuses a recipe without steps', () => {
        expect(messages(recipeForm({ instructions: [] }).instructions)).toEqual([
            'Ajoutez au moins une étape.',
        ]);
    });

    it('refuses an empty step', () => {
        expect(messages(recipeForm({ instructions: ['Mixer', ''] }).instructions[1])).toEqual([
            "L'étape est vide.",
        ]);
    });
});
