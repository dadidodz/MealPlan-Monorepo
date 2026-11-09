import { Temporal } from '@js-temporal/polyfill';
import { InvalidRecipeError } from './invalid-recipe.error';
import { NewRecipe, Recipe, RecipeIngredient } from './recipe.entity';

describe('Recipe', () => {
    const createdAt = Temporal.Instant.from('2026-10-01T10:00:00Z');
    const later = createdAt.add({ hours: 1 });
    const salt = new RecipeIngredient('ing-1', 'Sel', null, null, true, 'sel');

    const input = (changes: Partial<NewRecipe> = {}): NewRecipe => ({
        title: 'Tarte',
        description: null,
        basePortions: 4,
        instructions: ['Cuire 30 min'],
        aiExtraction: null,
        ingredients: [salt],
        category: 'dessert',
        imageUrl: null,
        ...changes,
    });

    describe('create', () => {
        it('keeps the given fields and sets both dates to now', () => {
            const recipe = Recipe.create(input(), createdAt);

            expect(recipe).toMatchObject({
                title: 'Tarte',
                description: null,
                basePortions: 4,
                instructions: ['Cuire 30 min'],
                aiExtraction: null,
                ingredients: [salt],
                category: 'dessert',
                imageUrl: null,
            });
            expect(recipe.createdAt.equals(createdAt)).toBe(true);
            expect(recipe.updatedAt.equals(createdAt)).toBe(true);
        });

        it('generates a different id for each recipe', () => {
            expect(Recipe.create(input(), createdAt).id).not.toBe(
                Recipe.create(input(), createdAt).id,
            );
        });

        it('trims the title', () => {
            expect(Recipe.create(input({ title: '  Tarte  ' }), createdAt).title).toBe('Tarte');
        });

        it.each(['', '   '])('rejects the title %j', (title) => {
            expect(() => Recipe.create(input({ title }), createdAt)).toThrow(InvalidRecipeError);
        });

        it.each([0, -1, 2.5])('rejects %d base portions', (basePortions) => {
            expect(() => Recipe.create(input({ basePortions }), createdAt)).toThrow(
                InvalidRecipeError,
            );
        });

        it('copies the lists it receives', () => {
            const instructions = ['Cuire'];
            const recipe = Recipe.create(input({ instructions }), createdAt);

            instructions.push('Servir');

            expect(recipe.instructions).toEqual(['Cuire']);
        });
    });

    describe('restore', () => {
        it('rebuilds a recipe as stored, without checks', () => {
            const recipe = Recipe.restore({
                ...input({ title: '', basePortions: 0 }),
                id: 'recipe-1',
                createdAt,
                updatedAt: later,
            });

            expect(recipe).toMatchObject({ id: 'recipe-1', title: '', basePortions: 0 });
            expect(recipe.updatedAt.equals(later)).toBe(true);
        });
    });

    describe('when changed', () => {
        let recipe: Recipe;

        beforeEach(() => {
            recipe = Recipe.create(input(), createdAt);
        });

        it.each<[string, (r: Recipe) => void, Partial<Record<keyof Recipe, unknown>>]>([
            ['rename', (r) => r.rename(' Quiche ', later), { title: 'Quiche' }],
            [
                'changeDescription',
                (r) => r.changeDescription('Classique', later),
                { description: 'Classique' },
            ],
            ['changePortions', (r) => r.changePortions(6, later), { basePortions: 6 }],
            [
                'changeInstructions',
                (r) => r.changeInstructions(['Mélanger'], later),
                { instructions: ['Mélanger'] },
            ],
            ['changeCategory', (r) => r.changeCategory('fish', later), { category: 'fish' }],
            [
                'changeImage',
                (r) => r.changeImage('https://example.com/t.jpg', later),
                { imageUrl: 'https://example.com/t.jpg' },
            ],
            ['replaceIngredients', (r) => r.replaceIngredients([], later), { ingredients: [] }],
            [
                'linkExtraction',
                (r) => r.linkExtraction({ id: 'ext-1', sourceUrl: 'https://t.co/1' }, later),
                { aiExtraction: { id: 'ext-1', sourceUrl: 'https://t.co/1' } },
            ],
        ])('%s updates the field and refreshes updatedAt', (_, change, expected) => {
            change(recipe);

            expect(recipe).toMatchObject(expected);
            expect(recipe.updatedAt.equals(later)).toBe(true);
            expect(recipe.createdAt.equals(createdAt)).toBe(true);
        });

        it('rename rejects an empty title and keeps the old one', () => {
            expect(() => recipe.rename(' ', later)).toThrow(InvalidRecipeError);
            expect(recipe.title).toBe('Tarte');
            expect(recipe.updatedAt.equals(createdAt)).toBe(true);
        });

        it('changePortions rejects a non-integer and keeps the old value', () => {
            expect(() => recipe.changePortions(1.5, later)).toThrow(InvalidRecipeError);
            expect(recipe.basePortions).toBe(4);
        });
    });
});
