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
    });
});
