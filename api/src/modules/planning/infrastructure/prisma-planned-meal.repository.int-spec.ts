import { Temporal } from '@js-temporal/polyfill';
import { resetDatabase } from '../../../../test/support/reset-database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RecipeNotFoundError } from '../../recipe/domain/recipe-not-found.error';
import { MealType, PlannedMeal } from '../domain/planned-meal.entity';
import { SlotAlreadyTakenError } from '../domain/slot-already-taken.error';
import { PrismaPlannedMealRepository } from './prisma-planned-meal.repository';

describe('PrismaPlannedMealRepository', () => {
    const prisma = new PrismaService();
    const repository = new PrismaPlannedMealRepository(prisma);
    let recipeId: string;

    function aMeal(mealType: MealType, peopleCount = 4, recipe = recipeId): PlannedMeal {
        return PlannedMeal.create({
            date: Temporal.PlainDate.from('2026-11-02'),
            mealType,
            recipeId: recipe,
            peopleCount,
        });
    }

    beforeEach(async () => {
        await resetDatabase(prisma);
        const recipe = await prisma.recipe.create({
            data: { title: 'Burger maison', basePortions: 2, instructions: [] },
        });
        recipeId = recipe.id;
    });

    afterAll(() => prisma.$disconnect());

    it('stores a meal on its calendar day', async () => {
        const meal = aMeal('DINNER');

        await repository.add(meal);

        const row = await prisma.plannedMeal.findUniqueOrThrow({ where: { id: meal.id } });
        expect(row).toMatchObject({ mealType: 'DINNER', peopleCount: 4, recipeId });
        expect(row.date.toISOString()).toBe('2026-11-02T00:00:00.000Z');
    });

    it('refuses a taken slot and leaves the existing meal unchanged', async () => {
        const first = aMeal('DINNER', 4);
        await repository.add(first);

        await expect(repository.add(aMeal('DINNER', 8))).rejects.toThrow(SlotAlreadyTakenError);

        const rows = await prisma.plannedMeal.findMany();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ id: first.id, peopleCount: 4 });
    });

    it('lets one of two simultaneous meals on a slot through', async () => {
        const results = await Promise.allSettled([
            repository.add(aMeal('DINNER')),
            repository.add(aMeal('DINNER')),
        ]);

        const refused = results.filter((result) => result.status === 'rejected');
        expect(refused).toHaveLength(1);
        expect(refused[0]?.reason).toBeInstanceOf(SlotAlreadyTakenError);
        expect(await prisma.plannedMeal.count()).toBe(1);
    });

    it('accepts the other slot of the same day', async () => {
        await repository.add(aMeal('LUNCH'));
        await repository.add(aMeal('DINNER'));

        expect(await prisma.plannedMeal.count()).toBe(2);
    });

    it('refuses an unknown recipe', async () => {
        const unknown = crypto.randomUUID();

        await expect(repository.add(aMeal('DINNER', 4, unknown))).rejects.toThrow(
            RecipeNotFoundError,
        );
        expect(await prisma.plannedMeal.count()).toBe(0);
    });
});
