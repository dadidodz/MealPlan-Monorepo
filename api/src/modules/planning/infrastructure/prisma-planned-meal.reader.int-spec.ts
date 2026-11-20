import { Temporal } from '@js-temporal/polyfill';
import { resetDatabase } from '../../../../test/support/reset-database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PlannedMealNotFoundError } from '../domain/planned-meal-not-found.error';
import { MealType } from '../domain/planned-meal.entity';
import { PrismaPlannedMealReader } from './prisma-planned-meal.reader';

const day = (date: string): Temporal.PlainDate => Temporal.PlainDate.from(date);

describe('PrismaPlannedMealReader', () => {
    const prisma = new PrismaService();
    const reader = new PrismaPlannedMealReader(prisma);
    let recipeId: string;

    function plan(date: string, mealType: MealType): Promise<unknown> {
        return prisma.plannedMeal.create({
            data: { date: new Date(`${date}T00:00:00Z`), mealType, peopleCount: 4, recipeId },
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

    it('lists the meals of the range, both days included', async () => {
        await plan('2026-11-01', 'DINNER');
        await plan('2026-11-02', 'LUNCH');
        await plan('2026-11-08', 'DINNER');
        await plan('2026-11-09', 'LUNCH');

        const meals = await reader.listBetween(day('2026-11-02'), day('2026-11-08'));

        expect(meals.map((meal) => meal.date.toString())).toEqual(['2026-11-02', '2026-11-08']);
    });

    it('sorts by date, then lunch before dinner', async () => {
        await plan('2026-11-03', 'DINNER');
        await plan('2026-11-03', 'LUNCH');
        await plan('2026-11-02', 'DINNER');

        const meals = await reader.listBetween(day('2026-11-02'), day('2026-11-08'));

        expect(meals.map((meal) => `${meal.date.toString()} ${meal.mealType}`)).toEqual([
            '2026-11-02 DINNER',
            '2026-11-03 LUNCH',
            '2026-11-03 DINNER',
        ]);
    });

    it('reads the meal with its recipe and the same calendar day', async () => {
        await plan('2026-11-02', 'DINNER');

        const [meal] = await reader.listBetween(day('2026-11-02'), day('2026-11-02'));

        expect(meal.date.equals(day('2026-11-02'))).toBe(true);
        expect(meal).toMatchObject({
            mealType: 'DINNER',
            peopleCount: 4,
            recipe: { id: recipeId, title: 'Burger maison' },
        });
    });

    describe('getDetails', () => {
        it('reads the meal with its recipe as stored, ingredients in recipe order', async () => {
            const recipe = await prisma.recipe.create({
                data: {
                    title: 'Salade de tomates',
                    basePortions: 2,
                    instructions: ['Couper', 'Servir'],
                    category: 'salad',
                    ingredients: {
                        create: [
                            {
                                position: 1,
                                quantity: null,
                                ingredient: { create: { name: 'sel', code: 'sel' } },
                            },
                            {
                                position: 0,
                                quantity: 200,
                                unit: 'g',
                                ingredient: { create: { name: 'tomate', code: 'tomate' } },
                            },
                        ],
                    },
                },
            });
            const meal = await prisma.plannedMeal.create({
                data: {
                    date: new Date('2026-11-02T00:00:00Z'),
                    mealType: 'LUNCH',
                    peopleCount: 4,
                    recipeId: recipe.id,
                },
            });

            const details = await reader.getDetails(meal.id);

            expect(details.date.toString()).toBe('2026-11-02');
            expect(details).toMatchObject({
                mealType: 'LUNCH',
                peopleCount: 4,
                recipe: {
                    id: recipe.id,
                    title: 'Salade de tomates',
                    category: 'salad',
                    imageUrl: null,
                    basePortions: 2,
                    instructions: ['Couper', 'Servir'],
                    ingredients: [
                        { name: 'tomate', quantity: 200, unit: 'g' },
                        { name: 'sel', quantity: null, unit: null },
                    ],
                },
            });
        });

        it('refuses an unknown id', async () => {
            await expect(reader.getDetails('not-a-meal')).rejects.toThrow(PlannedMealNotFoundError);
        });
    });

    it('returns nothing for a range with no meal', async () => {
        expect(await reader.listBetween(day('2026-11-02'), day('2026-11-08'))).toEqual([]);
    });

    it('lets the database refuse a second meal on the same slot', async () => {
        await plan('2026-11-02', 'DINNER');

        await expect(plan('2026-11-02', 'DINNER')).rejects.toThrow();
        await expect(plan('2026-11-02', 'LUNCH')).resolves.toBeDefined();
        await expect(plan('2026-11-03', 'DINNER')).resolves.toBeDefined();
    });
});
