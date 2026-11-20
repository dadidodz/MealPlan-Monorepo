import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
    RECIPE_REPOSITORY,
    RecipeRepository,
} from '../src/modules/recipe/domain/recipe-repository.port';
import { aRecipe } from '../src/modules/recipe/domain/recipe-repository.fake';
import { contractErrors, contractExamples } from './support/contract';
import { resetDatabase } from './support/reset-database';

describe('API contract (openapi.yaml)', () => {
    describe('the contract itself', () => {
        it('has examples that all match their own schema', () => {
            const examples = contractExamples();

            expect(examples.length).toBeGreaterThan(0);
            expect(examples.filter(({ errors }) => errors.length > 0)).toEqual([]);
        });
    });

    describe('contractErrors', () => {
        const recipe = {
            id: '3f2b8c1e-5d4a-4e7b-9c6f-1a2b3c4d5e6f',
            title: 'Burger maison',
            description: null,
            basePortions: 2,
            category: 'meat',
            imageUrl: null,
            createdAt: '2026-10-20T18:42:11.123Z',
            updatedAt: '2026-10-21T09:05:00.000Z',
        };

        it('finds nothing in a response that matches', () => {
            const errors = contractErrors('get', '/recipes', { status: 200, body: [recipe] });

            expect(errors).toEqual([]);
        });

        it('names a missing field', () => {
            const incomplete = { ...recipe, basePortions: undefined };

            const errors = contractErrors('get', '/recipes', { status: 200, body: [incomplete] });

            expect(errors.join()).toContain('basePortions');
        });

        it('names an undocumented field', () => {
            const errors = contractErrors('get', '/recipes', {
                status: 200,
                body: [{ ...recipe, secret: 'x' }],
            });

            expect(errors.join()).toContain('secret');
        });

        it('refuses a status the contract does not declare', () => {
            const errors = contractErrors('get', '/recipes', { status: 500, body: {} });

            expect(errors).toEqual(['GET /recipes declares no 500 response']);
        });
    });

    describe('real responses', () => {
        let app: INestApplication<App>;
        let recipes: RecipeRepository;

        beforeAll(async () => {
            const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
            app = moduleRef.createNestApplication();
            await app.init();
            recipes = app.get<RecipeRepository>(RECIPE_REPOSITORY);
        });

        beforeEach(() => resetDatabase(app.get(PrismaService)));

        afterAll(async () => {
            await app.close();
        });

        it('GET /recipes matches the contract, with the portions the picker pre-fills', async () => {
            await recipes.save(aRecipe({ basePortions: 2 }));

            const response = await request(app.getHttpServer()).get('/recipes').expect(200);
            const body: unknown = response.body;

            expect(contractErrors('get', '/recipes', response)).toEqual([]);
            expect(body).toMatchObject([{ basePortions: 2 }]);
        });

        it('GET /recipes?search= matches the contract', async () => {
            await recipes.save(aRecipe());

            const response = await request(app.getHttpServer())
                .get('/recipes')
                .query({ search: 'tom' })
                .expect(200);

            expect(contractErrors('get', '/recipes', response)).toEqual([]);
        });

        it('GET /recipes returns 25 recipes by default, then the next ones on page 2', async () => {
            for (let i = 0; i < 26; i++) {
                await recipes.save(aRecipe());
            }

            const first = await request(app.getHttpServer()).get('/recipes').expect(200);
            const second = await request(app.getHttpServer())
                .get('/recipes')
                .query({ page: 2 })
                .expect(200);
            const firstBody: unknown = first.body;
            const secondBody: unknown = second.body;

            expect(firstBody).toHaveLength(25);
            expect(secondBody).toHaveLength(1);
        });

        it.each([
            'page=0',
            'page=-1',
            'page=abc',
            'page=1.5',
            'page=1001',
            'page=99999999999999999999',
            'limit=0',
            'limit=-1',
            'limit=101',
            `search=${'a'.repeat(101)}`,
        ])('GET /recipes?%s returns 400 in the contract format', async (query) => {
            const response = await request(app.getHttpServer())
                .get(`/recipes?${query}`)
                .expect(400);

            expect(contractErrors('get', '/recipes', response)).toEqual([]);
        });

        describe('GET /planned-meals', () => {
            const week = { from: '2026-11-02', to: '2026-11-08' };

            it('matches the contract, with the meals of the range in order', async () => {
                const recipe = aRecipe();
                await recipes.save(recipe);
                const planned = (date: string, mealType: 'LUNCH' | 'DINNER'): Promise<unknown> =>
                    app.get(PrismaService).plannedMeal.create({
                        data: {
                            date: new Date(`${date}T00:00:00Z`),
                            mealType,
                            peopleCount: 4,
                            recipeId: recipe.id,
                        },
                    });
                await planned('2026-11-03', 'DINNER');
                await planned('2026-11-03', 'LUNCH');
                await planned('2026-11-09', 'LUNCH');

                const response = await request(app.getHttpServer())
                    .get('/planned-meals')
                    .query(week)
                    .expect(200);
                const body: unknown = response.body;

                expect(contractErrors('get', '/planned-meals', response)).toEqual([]);
                expect(body).toMatchObject([
                    {
                        date: '2026-11-03',
                        mealType: 'LUNCH',
                        peopleCount: 4,
                        recipe: { id: recipe.id, title: recipe.title },
                    },
                    { date: '2026-11-03', mealType: 'DINNER' },
                ]);
            });

            it('matches the contract for a week with no meal', async () => {
                const response = await request(app.getHttpServer())
                    .get('/planned-meals')
                    .query(week)
                    .expect(200);
                const body: unknown = response.body;

                expect(contractErrors('get', '/planned-meals', response)).toEqual([]);
                expect(body).toEqual([]);
            });

            it('answers 422 INVALID_DATE_RANGE in the contract format when from is after to', async () => {
                const response = await request(app.getHttpServer())
                    .get('/planned-meals')
                    .query({ from: week.to, to: week.from })
                    .expect(422);

                expect(contractErrors('get', '/planned-meals', response)).toEqual([]);
            });

            it.each([
                'to=2026-11-08',
                'from=2026-11-02',
                'from=2026-02-30&to=2026-11-08',
                'from=2026-11-02&to=2026-13-01',
                'from=2026-11-02T10:00:00&to=2026-11-08',
                'from=2026-W45-1&to=2026-11-08',
                'from=0000-01-01&to=2026-11-08',
                'from=2026-11-02&to=2026-11-08&foo=1',
                `from=${encodeURIComponent("2026-11-02' OR '1'='1")}&to=2026-11-08`,
            ])('GET /planned-meals?%s returns 400 in the contract format', async (query) => {
                const response = await request(app.getHttpServer())
                    .get(`/planned-meals?${query}`)
                    .expect(400);

                expect(contractErrors('get', '/planned-meals', response)).toEqual([]);
            });
        });

        describe('POST /planned-meals', () => {
            const slot = { date: '2026-11-02', mealType: 'DINNER' };
            let burgerId: string;

            function post(body: object): request.Test {
                return request(app.getHttpServer()).post('/planned-meals').send(body);
            }

            beforeEach(async () => {
                // A burger recipe for 2
                const burger = await app.get(PrismaService).recipe.create({
                    data: {
                        title: 'Burger maison',
                        basePortions: 2,
                        instructions: ['Monter les burgers.'],
                        category: 'sandwich',
                        ingredients: {
                            create: [
                                {
                                    position: 0,
                                    quantity: 1,
                                    unit: 'pièce',
                                    ingredient: { create: { name: 'oignon', code: 'oignon' } },
                                },
                                {
                                    position: 1,
                                    quantity: null,
                                    ingredient: { create: { name: 'sel', code: 'sel' } },
                                },
                            ],
                        },
                    },
                });
                burgerId = burger.id;
            });

            it('answers 201 in the contract format, quantities scaled to the meal', async () => {
                const response = await post({ ...slot, recipeId: burgerId, peopleCount: 3 }).expect(
                    201,
                );
                const body: unknown = response.body;

                expect(contractErrors('post', '/planned-meals', response)).toEqual([]);
                expect(body).toMatchObject({
                    ...slot,
                    peopleCount: 3,
                    recipe: {
                        id: burgerId,
                        title: 'Burger maison',
                        ingredients: [
                            { name: 'oignon', quantity: 1.5, unit: 'pièce' },
                            { name: 'sel', quantity: null, unit: null },
                        ],
                    },
                });
            });

            it('shows the new meal in the week', async () => {
                await post({ ...slot, recipeId: burgerId, peopleCount: 4 }).expect(201);

                const response = await request(app.getHttpServer())
                    .get('/planned-meals')
                    .query({ from: slot.date, to: slot.date })
                    .expect(200);
                const body: unknown = response.body;

                expect(body).toMatchObject([{ ...slot, peopleCount: 4 }]);
            });

            it.each([1, 100])('accepts %s people', async (peopleCount) => {
                await post({ ...slot, recipeId: burgerId, peopleCount }).expect(201);
            });

            it('answers 409 SLOT_ALREADY_TAKEN in the contract format, keeping the meal', async () => {
                await post({ ...slot, recipeId: burgerId, peopleCount: 4 }).expect(201);

                const response = await post({ ...slot, recipeId: burgerId, peopleCount: 8 }).expect(
                    409,
                );
                const body: unknown = response.body;

                expect(contractErrors('post', '/planned-meals', response)).toEqual([]);
                expect(body).toMatchObject({ code: 'SLOT_ALREADY_TAKEN' });
                expect(
                    await app.get(PrismaService).plannedMeal.findMany({
                        select: { peopleCount: true },
                    }),
                ).toEqual([{ peopleCount: 4 }]);
            });

            it('answers 404 RECIPE_NOT_FOUND in the contract format', async () => {
                const response = await post({
                    ...slot,
                    recipeId: '3f2b8c1e-5d4a-4e7b-9c6f-1a2b3c4d5e6f',
                    peopleCount: 4,
                }).expect(404);
                const body: unknown = response.body;

                expect(contractErrors('post', '/planned-meals', response)).toEqual([]);
                expect(body).toMatchObject({ code: 'RECIPE_NOT_FOUND' });
            });

            it.each([
                ['no date', { date: undefined }],
                ['no meal type', { mealType: undefined }],
                ['no recipe', { recipeId: undefined }],
                ['no number of people', { peopleCount: undefined }],
                ['0 people', { peopleCount: 0 }],
                ['-1 people', { peopleCount: -1 }],
                ['1.5 people', { peopleCount: 1.5 }],
                ['"4" people', { peopleCount: '4' }],
                ['101 people', { peopleCount: 101 }],
                ['3000000000 people', { peopleCount: 3000000000 }],
                ['2026-02-30', { date: '2026-02-30' }],
                ['a date with a time', { date: '2026-11-02T10:00:00' }],
                ['0000-01-01', { date: '0000-01-01' }],
                ['BRUNCH', { mealType: 'BRUNCH' }],
                ['a recipe id that is not a UUID', { recipeId: 'not-a-uuid' }],
                ['an unknown field', { id: '3f2b8c1e-5d4a-4e7b-9c6f-1a2b3c4d5e6f' }],
                ['SQL-like text', { date: "2026-11-02' OR '1'='1" }],
            ])('answers 400 in the contract format with %s', async (_, change) => {
                const response = await post({
                    ...slot,
                    recipeId: burgerId,
                    peopleCount: 4,
                    ...change,
                }).expect(400);

                expect(contractErrors('post', '/planned-meals', response)).toEqual([]);
                expect(await app.get(PrismaService).plannedMeal.count()).toBe(0);
            });
        });
    });
});
