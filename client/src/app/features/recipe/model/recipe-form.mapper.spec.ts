import { ExtractedRecipe } from '../../extract-recipe/model/extractor.type';
import { draftToFormModel, toFormModel, toPayload } from './recipe-form.mapper';
import { RecipeResponse } from './recipe.type';

const recipe: RecipeResponse = {
    id: '42',
    title: 'Velouté',
    description: null,
    basePortions: 4,
    instructions: ['Mixer'],
    sourceUrl: 'https://www.tiktok.com/@chef/video/1',
    ingredients: [
        {
            ingredientId: 'i1',
            name: 'potiron',
            quantity: 500,
            unit: 'g',
            isIgnoredInShoppingList: false,
        },
        {
            ingredientId: 'i2',
            name: 'sel',
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

describe('toFormModel', () => {
    it('loads a saved recipe with empty text as "" and capitalised ingredient names', () => {
        expect(toFormModel(recipe)).toEqual({
            title: 'Velouté',
            description: '',
            basePortions: 4,
            category: 'soup',
            ingredients: [
                { name: 'Potiron', quantity: 500, unit: 'g' },
                { name: 'Sel', quantity: null, unit: '' },
            ],
            instructions: ['Mixer'],
        });
    });
});

describe('draftToFormModel', () => {
    it('loads an AI draft without description as ""', () => {
        const draft: ExtractedRecipe = {
            title: 'Omelette',
            description: null,
            basePortions: 2,
            ingredients: [],
            instructions: ['Battre'],
            category: 'breakfast',
        };

        expect(draftToFormModel(draft).description).toBe('');
    });

    it('loads an AI draft with capitalised ingredient names', () => {
        const draft: ExtractedRecipe = {
            title: 'Omelette',
            description: 'Rapide',
            basePortions: 2,
            ingredients: [{ name: 'œufs', quantity: 3, unit: null }],
            instructions: ['Battre'],
            category: 'breakfast',
            sourceUrl: 'https://www.tiktok.com/@chef/video/2',
        };

        expect(draftToFormModel(draft)).toEqual({
            title: 'Omelette',
            description: 'Rapide',
            basePortions: 2,
            category: 'breakfast',
            ingredients: [{ name: 'Œufs', quantity: 3, unit: '' }],
            instructions: ['Battre'],
        });
    });
});

describe('toPayload', () => {
    it('saves a recipe loaded unchanged with null for no description, quantity or unit', () => {
        expect(toPayload(toFormModel(recipe))).toEqual({
            title: 'Velouté',
            description: null,
            basePortions: 4,
            category: 'soup',
            ingredients: [
                { name: 'Potiron', quantity: 500, unit: 'g' },
                { name: 'Sel', quantity: null, unit: null },
            ],
            instructions: ['Mixer'],
        });
    });

    it('saves a blank description as null', () => {
        const model = { ...toFormModel(recipe), description: '  ' };
        expect(toPayload(model).description).toBeNull();
    });

    it('keeps a written description', () => {
        const model = { ...toFormModel(recipe), description: 'Doux' };
        expect(toPayload(model).description).toBe('Doux');
    });
});
