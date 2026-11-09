import { Temporal } from '@js-temporal/polyfill';
import { resetDatabase } from '../../../../test/support/reset-database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Recipe, RecipeIngredient } from '../domain/recipe.entity';
import { aRecipe } from '../domain/recipe-repository.fake';
import { PrismaRecipeRepository } from './prisma-recipe.repository';

describe('PrismaRecipeRepository', () => {
    const prisma = new PrismaService();
    const repository = new PrismaRecipeRepository(prisma);
    // Millisecond precision: what PostgreSQL timestamps keep
    const createdAt = Temporal.Instant.from('2026-03-01T08:15:30.123Z');
    const updatedAt = Temporal.Instant.from('2026-03-02T09:00:00.456Z');

    const flour = (): RecipeIngredient =>
        new RecipeIngredient(crypto.randomUUID(), 'Farine', 200, 'g', false, 'farine');

    beforeEach(() => resetDatabase(prisma));
    afterAll(() => prisma.$disconnect());

    it('saves and reloads a recipe with its fields, dates and ingredients', async () => {
        const ingredient = flour();
        const recipe = aRecipe({
            title: 'Tarte',
            description: 'Classique',
            basePortions: 6,
            instructions: ['Étaler la pâte', 'Cuire 30 min'],
            category: 'dessert',
            imageUrl: 'https://example.com/tarte.jpg',
            ingredients: [ingredient],
            createdAt,
            updatedAt,
        });

        await repository.save(recipe);
        const reloaded = await repository.findById(recipe.id);

        expect(reloaded).toMatchObject({
            id: recipe.id,
            title: 'Tarte',
            description: 'Classique',
            basePortions: 6,
            instructions: ['Étaler la pâte', 'Cuire 30 min'],
            category: 'dessert',
            imageUrl: 'https://example.com/tarte.jpg',
            aiExtraction: null,
        });
        expect(reloaded?.createdAt.equals(createdAt)).toBe(true);
        expect(reloaded?.updatedAt.equals(updatedAt)).toBe(true);
        expect(reloaded?.ingredients).toEqual([ingredient]);
    });

    it('keeps null fields as null', async () => {
        const ingredient = new RecipeIngredient(
            crypto.randomUUID(),
            'Sel',
            null,
            null,
            true,
            'sel',
        );
        const recipe = aRecipe({ description: null, imageUrl: null, ingredients: [ingredient] });

        await repository.save(recipe);
        const reloaded = await repository.findById(recipe.id);

        expect(reloaded).toMatchObject({ description: null, imageUrl: null });
        expect(reloaded?.ingredients).toEqual([ingredient]);
    });

    it('returns null for an unknown id', async () => {
        expect(await repository.findById('missing')).toBeNull();
    });

    it('finds a recipe by the source URL of its AI extraction', async () => {
        const sourceUrl = 'https://www.tiktok.com/@chef/video/123';
        const extraction = await prisma.recipeAiExtraction.create({
            data: { sourceUrl, status: 'SUCCESS', aiModel: 'gemini-2.5-flash' },
        });
        const recipe = aRecipe({ aiExtraction: { id: extraction.id, sourceUrl } });
        await repository.save(recipe);

        const found = await repository.findBySourceUrl(sourceUrl);

        expect(found?.id).toBe(recipe.id);
        expect(found?.aiExtraction).toEqual({
            id: extraction.id,
            sourceUrl,
            aiModel: 'gemini-2.5-flash',
        });
        expect(await repository.findBySourceUrl('https://www.tiktok.com/other')).toBeNull();
    });

    it('updates an existing recipe, its ingredients and its updatedAt', async () => {
        const recipe = aRecipe({ ingredients: [flour()] });
        await repository.save(recipe);
        const sugar = new RecipeIngredient(crypto.randomUUID(), 'Sucre', 100, 'g', false, 'sucre');

        recipe.rename('Quiche', updatedAt);
        recipe.replaceIngredients([sugar], updatedAt);
        await repository.save(recipe);

        const reloaded = await repository.findById(recipe.id);
        expect(reloaded?.title).toBe('Quiche');
        expect(reloaded?.ingredients).toEqual([sugar]);
        expect(reloaded?.updatedAt.equals(updatedAt)).toBe(true);
    });

    it('reloads the ingredients in the saved order, whatever the physical row order', async () => {
        const sourceUrl = 'https://www.tiktok.com/@chef/video/456';
        const extraction = await prisma.recipeAiExtraction.create({
            data: { sourceUrl, status: 'SUCCESS' },
        });
        const names = ['Farine', 'Sucre', 'Beurre'];
        const recipe = aRecipe({
            aiExtraction: { id: extraction.id, sourceUrl },
            ingredients: names.map(
                (name) =>
                    new RecipeIngredient(
                        crypto.randomUUID(),
                        name,
                        null,
                        null,
                        false,
                        name.toLowerCase(),
                    ),
            ),
        });
        await repository.save(recipe);
        // PostgreSQL writes an updated row at the end of the table: a read without ORDER BY now lists it last
        const first = await prisma.recipeIngredient.findFirstOrThrow({
            where: { recipeId: recipe.id, ingredient: { code: 'farine' } },
        });
        await prisma.recipeIngredient.update({
            where: { id: first.id },
            data: { quantity: 1 },
        });

        const namesOf = (reloaded: Recipe | null | undefined): string[] =>
            reloaded?.ingredients.map((i) => i.name) ?? [];
        expect(namesOf(await repository.findById(recipe.id))).toEqual(names);
        expect(namesOf(await repository.findBySourceUrl(sourceUrl))).toEqual(names);
    });

    it('shares one ingredient row between recipes using the same code', async () => {
        const first = flour();
        await repository.save(aRecipe({ ingredients: [first] }));
        const second = aRecipe({ ingredients: [flour()] });

        await repository.save(second);

        const reloaded = await repository.findById(second.id);
        expect(reloaded?.ingredients[0].ingredientId).toBe(first.ingredientId);
        expect(await prisma.ingredient.count()).toBe(1);
    });

    it('reads a stored category outside the list as other', async () => {
        const recipe = aRecipe();
        await repository.save(recipe);
        await prisma.recipe.update({
            where: { id: recipe.id },
            data: { category: 'lucideUtensils' },
        });

        expect((await repository.findById(recipe.id))?.category).toBe('other');
    });
});
