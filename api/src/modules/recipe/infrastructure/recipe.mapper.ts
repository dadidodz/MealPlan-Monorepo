import { Recipe, RecipeExtractionInfo, RecipeIngredient } from '../domain/recipe.entity';
import {
    Recipe as PrismaRecipe,
    RecipeIngredient as PrismaRecipeIngredient,
    Ingredient as PrismaIngredient,
    RecipeAiExtraction,
    Prisma,
} from '@prisma/client';
import { Temporal } from '@js-temporal/polyfill';
import { recipeCategoryOf } from '../domain/recipe-category';

type PrismaRecipeWithIngredients = PrismaRecipe & {
    ingredients: (PrismaRecipeIngredient & { ingredient: PrismaIngredient })[];
    aiExtraction?: RecipeAiExtraction | null;
};
/** Create input with the ingredients as a plain list: `save` reuses it in the update branch. */
type RecipePersistence = Prisma.RecipeUncheckedCreateInput & {
    ingredients: { create: Prisma.RecipeIngredientCreateWithoutRecipeInput[] };
};

export class RecipeMapper {
    static toDomain(prismaRecipe: PrismaRecipeWithIngredients): Recipe {
        const ingredients = prismaRecipe.ingredients.map(
            (i) =>
                new RecipeIngredient(
                    i.ingredientId,
                    i.ingredient.name,
                    i.quantity,
                    i.unit,
                    i.isIgnoredInShoppingList,
                    i.ingredient.code,
                ),
        );

        // Prisma extraction → RecipeExtractionInfo
        const extractionInfo: RecipeExtractionInfo | null = prismaRecipe.aiExtraction
            ? {
                  id: prismaRecipe.aiExtraction.id,
                  sourceUrl: prismaRecipe.aiExtraction.sourceUrl,
                  aiModel: prismaRecipe.aiExtraction.aiModel,
              }
            : null;

        return Recipe.restore({
            id: prismaRecipe.id,
            title: prismaRecipe.title,
            description: prismaRecipe.description,
            basePortions: prismaRecipe.basePortions,
            instructions: prismaRecipe.instructions,
            aiExtraction: extractionInfo,
            ingredients,
            category: recipeCategoryOf(prismaRecipe.category),
            imageUrl: prismaRecipe.imageUrl,
            createdAt: Temporal.Instant.fromEpochMilliseconds(prismaRecipe.createdAt.getTime()),
            updatedAt: Temporal.Instant.fromEpochMilliseconds(prismaRecipe.updatedAt.getTime()),
        });
    }

    static toPersistence(recipe: Recipe): RecipePersistence {
        return {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            basePortions: recipe.basePortions,
            instructions: [...recipe.instructions],
            aiExtractionId: recipe.aiExtraction ? recipe.aiExtraction.id : null,
            category: recipe.category,
            imageUrl: recipe.imageUrl,
            createdAt: new Date(recipe.createdAt.epochMilliseconds),
            updatedAt: new Date(recipe.updatedAt.epochMilliseconds),

            ingredients: {
                create: recipe.ingredients.map((i, position) => ({
                    position,
                    quantity: i.quantity,
                    unit: i.unit,
                    isIgnoredInShoppingList: i.isIgnoredInShoppingList,
                    ingredient: {
                        connectOrCreate: {
                            where: { code: i.code },
                            create: {
                                id: i.ingredientId,
                                name: i.name,
                                code: i.code,
                                // No category yet: an ingredient created from a recipe has none
                            },
                        },
                    },
                })),
            },
        };
    }
}
