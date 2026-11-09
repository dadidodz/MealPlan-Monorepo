import { ingredientCodeOf } from '../../ingredient/domain/ingredient-code';
import { Clock } from '../../../shared/domain/clock.port';
import { Recipe, RecipeIngredient } from '../domain/recipe.entity';
import { RecipeNotFoundError } from '../domain/recipe-not-found.error';
import { RecipeRepository } from '../domain/recipe-repository.port';
import { RecipeCategory } from '../domain/recipe-category';

/** Partial update: only the fields present are changed. */
export interface UpdateRecipeCommand {
    id: string;
    title?: string;
    description?: string | null;
    basePortions?: number;
    instructions?: string[];
    category?: RecipeCategory;
    imageUrl?: string | null;
    ingredients?: {
        name: string;
        quantity?: number | null;
        unit?: string | null;
        isIgnoredInShoppingList?: boolean;
    }[];
}

export class UpdateRecipeUseCase {
    constructor(
        private readonly recipeRepository: RecipeRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: UpdateRecipeCommand): Promise<Recipe> {
        const recipe = await this.recipeRepository.findById(command.id);
        if (!recipe) throw new RecipeNotFoundError(command.id);

        // Each change refreshes updatedAt
        const now = this.clock.now();
        if (command.title !== undefined) recipe.rename(command.title, now);
        if (command.description !== undefined) recipe.changeDescription(command.description, now);
        if (command.basePortions !== undefined) recipe.changePortions(command.basePortions, now);
        if (command.category !== undefined) recipe.changeCategory(command.category, now);
        if (command.imageUrl !== undefined) recipe.changeImage(command.imageUrl, now);
        if (command.instructions !== undefined)
            recipe.changeInstructions(command.instructions, now);

        // Ingredients are rebuilt with the same rules as on creation
        if (command.ingredients) {
            const ingredients = command.ingredients.map((i) => {
                const name = i.name.trim();
                return new RecipeIngredient(
                    crypto.randomUUID(),
                    name,
                    i.quantity ?? null,
                    i.unit ?? null,
                    i.isIgnoredInShoppingList ?? false,
                    ingredientCodeOf(name),
                );
            });
            recipe.replaceIngredients(ingredients, now);
        }

        await this.recipeRepository.save(recipe);
        return recipe;
    }
}
