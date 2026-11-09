import { InMemoryRecipeRepository, aRecipe } from '../domain/recipe-repository.fake';
import { RecipeNotFoundError } from '../domain/recipe-not-found.error';
import { GetRecipeByIdUseCase } from './get-recipe-by-id.use-case';

describe('GetRecipeByIdUseCase', () => {
    let recipes: InMemoryRecipeRepository;
    let useCase: GetRecipeByIdUseCase;

    beforeEach(() => {
        recipes = new InMemoryRecipeRepository();
        useCase = new GetRecipeByIdUseCase(recipes);
    });

    it('returns the recipe with that id', async () => {
        const recipe = aRecipe();
        await recipes.save(recipe);

        expect(await useCase.execute(recipe.id)).toBe(recipe);
    });

    it('fails with RecipeNotFoundError for an unknown id', async () => {
        await expect(useCase.execute('missing')).rejects.toThrow(RecipeNotFoundError);
    });
});
