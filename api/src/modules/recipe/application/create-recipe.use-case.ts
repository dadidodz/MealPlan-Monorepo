import { AiExtractionRepository } from '../domain/ai-extraction-repository.port';
import { ingredientCodeOf } from '../../ingredient/domain/ingredient-code';
import { Recipe, RecipeIngredient } from '../domain/recipe.entity';
import { RecipeRepository } from '../domain/recipe-repository.port';
import { RecipeCategory } from '../domain/recipe-category';
import { Clock } from '../../../shared/domain/clock.port';

export interface CreateRecipeCommand {
    title: string;
    description: string | null;
    basePortions: number;
    instructions: string[];
    sourceUrl: string | null;
    ingredients: {
        name: string;
        quantity: number | null;
        unit: string | null;
        isIgnoredInShoppingList?: boolean;
    }[];
    category: RecipeCategory;
    imageUrl: string | null;
}

export class CreateRecipeUseCase {
    constructor(
        private readonly recipeRepository: RecipeRepository,
        private readonly extractionRepo: AiExtractionRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: CreateRecipeCommand): Promise<Recipe> {
        const now = this.clock.now();
        const ingredients = command.ingredients.map((i) => {
            const displayName = i.name.trim();

            const code = ingredientCodeOf(displayName);

            return new RecipeIngredient(
                crypto.randomUUID(),
                displayName,
                i.quantity,
                i.unit,
                i.isIgnoredInShoppingList ?? false,
                code,
            );
        });

        const recipe = Recipe.create(
            {
                title: command.title,
                description: command.description,
                basePortions: command.basePortions,
                instructions: command.instructions,
                aiExtraction: null,
                ingredients,
                category: command.category,
                imageUrl: command.imageUrl,
            },
            now,
        );

        // Only once the recipe is valid: never leave an extraction behind for a rejected recipe
        if (command.sourceUrl) {
            let extraction = await this.extractionRepo.findByUrl(command.sourceUrl);

            if (!extraction) {
                await this.extractionRepo.upsert(command.sourceUrl, 'MANUAL');
                extraction = await this.extractionRepo.findByUrl(command.sourceUrl);
            }

            if (extraction) {
                recipe.linkExtraction(
                    {
                        id: extraction.id,
                        sourceUrl: extraction.sourceUrl,
                        aiModel: extraction.aiModel,
                    },
                    now,
                );
            }
        }

        await this.recipeRepository.save(recipe);

        return recipe;
    }
}
