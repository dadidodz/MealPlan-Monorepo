import { Temporal } from '@js-temporal/polyfill';
import { resetDatabase } from '../../../../test/support/reset-database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { aRecipe } from '../domain/recipe-repository.fake';
import { PrismaRecipeReader } from './prisma-recipe.reader';
import { PrismaRecipeRepository } from './prisma-recipe.repository';

describe('PrismaRecipeReader', () => {
    const prisma = new PrismaService();
    const reader = new PrismaRecipeReader(prisma);
    const recipes = new PrismaRecipeRepository(prisma);
    // Millisecond precision: what PostgreSQL timestamps keep
    const createdAt = Temporal.Instant.from('2026-03-01T08:15:30.123Z');
    const updatedAt = Temporal.Instant.from('2026-03-02T09:00:00.456Z');

    beforeEach(() => resetDatabase(prisma));
    afterAll(() => prisma.$disconnect());

    it('lists recipe summaries newest first, page by page', async () => {
        for (const day of [1, 2, 3]) {
            await recipes.save(
                aRecipe({
                    title: `Recette ${day}`,
                    createdAt: createdAt.add({ hours: 24 * day }),
                    updatedAt,
                }),
            );
        }

        const firstPage = await reader.list({ limit: 2, offset: 0 });
        const secondPage = await reader.list({ limit: 2, offset: 2 });

        expect(firstPage.map((r) => r.title)).toEqual(['Recette 3', 'Recette 2']);
        expect(secondPage.map((r) => r.title)).toEqual(['Recette 1']);
        expect(secondPage[0]).toMatchObject({
            description: null,
            basePortions: 4,
            category: 'dessert',
            imageUrl: null,
        });
        expect(secondPage[0].createdAt.equals(createdAt.add({ hours: 24 }))).toBe(true);
        expect(secondPage[0].updatedAt.equals(updatedAt)).toBe(true);
    });

    it('reads a stored category outside the list as other', async () => {
        const recipe = aRecipe();
        await recipes.save(recipe);
        await prisma.recipe.update({
            where: { id: recipe.id },
            data: { category: 'lucideUtensils' },
        });

        expect((await reader.list({ limit: 1, offset: 0 }))[0].category).toBe('other');
    });
});
