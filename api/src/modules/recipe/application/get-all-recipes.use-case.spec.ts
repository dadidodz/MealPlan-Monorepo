import { Temporal } from '@js-temporal/polyfill';
import { InMemoryRecipeReader } from '../domain/recipe-reader.fake';
import { InMemoryRecipeRepository, aRecipe } from '../domain/recipe-repository.fake';
import { GetAllRecipesUseCase } from './get-all-recipes.use-case';

describe('GetAllRecipesUseCase', () => {
    let recipes: InMemoryRecipeRepository;
    let useCase: GetAllRecipesUseCase;

    beforeEach(async () => {
        recipes = new InMemoryRecipeRepository();
        useCase = new GetAllRecipesUseCase(new InMemoryRecipeReader(recipes));
        const first = Temporal.Instant.from('2026-01-01T10:00:00Z');
        for (let day = 0; day < 25; day++) {
            await recipes.save(
                aRecipe({ title: `Recette ${day}`, createdAt: first.add({ hours: 24 * day }) }),
            );
        }
    });

    it('returns the first page, newest first', async () => {
        const page = await useCase.execute(1, 10);

        expect(page.map((r) => r.title)).toEqual(
            Array.from({ length: 10 }, (_, i) => `Recette ${24 - i}`),
        );
    });

    it('skips the recipes of the previous pages', async () => {
        const page = await useCase.execute(3, 10);

        expect(page.map((r) => r.title)).toEqual([
            'Recette 4',
            'Recette 3',
            'Recette 2',
            'Recette 1',
            'Recette 0',
        ]);
    });

    it('returns an empty list past the last page', async () => {
        expect(await useCase.execute(4, 10)).toEqual([]);
    });
});
