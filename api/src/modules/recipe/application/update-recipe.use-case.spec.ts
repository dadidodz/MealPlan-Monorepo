import { Temporal } from '@js-temporal/polyfill';
import { FixedClock } from '../../../shared/domain/clock.fake';
import { RecipeIngredient } from '../domain/recipe.entity';
import { InMemoryRecipeRepository, aRecipe } from '../domain/recipe-repository.fake';
import { RecipeNotFoundError } from '../domain/recipe-not-found.error';
import { UpdateRecipeCommand, UpdateRecipeUseCase } from './update-recipe.use-case';

describe('UpdateRecipeUseCase', () => {
    const now = Temporal.Instant.from('2026-10-08T09:00:00Z');
    let recipes: InMemoryRecipeRepository;
    let useCase: UpdateRecipeUseCase;

    const update = (id: string, fields: Omit<UpdateRecipeCommand, 'id'>): UpdateRecipeCommand => ({
        id,
        ...fields,
    });

    const seed = async (): Promise<string> => {
        const recipe = aRecipe({
            description: 'Classique',
            ingredients: [new RecipeIngredient('ing-1', 'Sel', null, null, true, 'sel')],
        });
        await recipes.save(recipe);
        return recipe.id;
    };

    beforeEach(() => {
        recipes = new InMemoryRecipeRepository();
        useCase = new UpdateRecipeUseCase(recipes, new FixedClock(now));
    });

    it('changes only the fields it receives', async () => {
        const id = await seed();

        await useCase.execute(update(id, { title: 'Quiche' }));

        expect(recipes.recipes.get(id)).toMatchObject({
            title: 'Quiche',
            description: 'Classique',
            basePortions: 4,
            instructions: ['Cuire 30 min'],
            category: 'dessert',
            imageUrl: null,
            ingredients: [expect.objectContaining({ name: 'Sel' })],
        });
    });

    it('updates every simple field it receives', async () => {
        const id = await seed();

        const updated = await useCase.execute(
            update(id, {
                description: 'Revisitée',
                basePortions: 6,
                instructions: ['Mélanger', 'Cuire'],
                category: 'fish',
                imageUrl: 'https://example.com/tarte.jpg',
            }),
        );

        expect(updated).toMatchObject({
            title: 'Tarte',
            description: 'Revisitée',
            basePortions: 6,
            instructions: ['Mélanger', 'Cuire'],
            category: 'fish',
            imageUrl: 'https://example.com/tarte.jpg',
        });
        expect(recipes.recipes.get(id)).toBe(updated);
    });

    it('replaces the ingredients, trimming names and deriving codes', async () => {
        const id = await seed();

        await useCase.execute(
            update(id, { ingredients: [{ name: ' Crème fraîche ', quantity: 20, unit: 'cl' }] }),
        );

        expect(recipes.recipes.get(id)?.ingredients).toEqual([
            expect.objectContaining({
                name: 'Crème fraîche',
                code: 'creme-fraiche',
                quantity: 20,
                unit: 'cl',
            }),
        ]);
    });

    it('fails with RecipeNotFoundError on an unknown recipe', async () => {
        await expect(useCase.execute(update('missing', { title: 'Quiche' }))).rejects.toThrow(
            RecipeNotFoundError,
        );
    });

    it('keeps isIgnoredInShoppingList sent with an ingredient', async () => {
        const id = await seed();

        await useCase.execute(
            update(id, {
                ingredients: [
                    { name: 'Sel', quantity: null, unit: null, isIgnoredInShoppingList: true },
                ],
            }),
        );

        expect(recipes.recipes.get(id)?.ingredients[0].isIgnoredInShoppingList).toBe(true);
    });

    it('refreshes updatedAt to the current time', async () => {
        const id = await seed();

        await useCase.execute(update(id, { title: 'Quiche' }));

        expect(recipes.recipes.get(id)?.updatedAt.equals(now)).toBe(true);
    });
});
