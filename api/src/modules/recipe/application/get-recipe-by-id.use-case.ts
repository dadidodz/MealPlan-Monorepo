import { Recipe } from '../domain/recipe.entity';
import { RecipeNotFoundError } from '../domain/recipe-not-found.error';
import { RecipeRepository } from '../domain/recipe-repository.port';

export class GetRecipeByIdUseCase {
    constructor(private readonly recipeRepository: RecipeRepository) {}

    async execute(id: string): Promise<Recipe> {
        const recipe = await this.recipeRepository.findById(id);
        if (!recipe) throw new RecipeNotFoundError(id);
        return recipe;
    }
}
