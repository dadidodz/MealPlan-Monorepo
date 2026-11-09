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
import { resetDatabase } from './support/reset-database';

describe('Recipes (e2e)', () => {
    const unknownId = '00000000-0000-4000-8000-000000000000';
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
        await resetDatabase(app.get(PrismaService));
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /recipes/:id returns 404 with a code for an unknown recipe', async () => {
        const response = await request(app.getHttpServer())
            .get(`/recipes/${unknownId}`)
            .expect(404);
        const body: unknown = response.body;

        expect(body).toMatchObject({ statusCode: 404, code: 'RECIPE_NOT_FOUND' });
    });

    it('PATCH /recipes/:id returns 404 with a code for an unknown recipe', async () => {
        const response = await request(app.getHttpServer())
            .patch(`/recipes/${unknownId}`)
            .send({ title: 'Quiche' })
            .expect(404);
        const body: unknown = response.body;

        expect(body).toMatchObject({ statusCode: 404, code: 'RECIPE_NOT_FOUND' });
    });

    it.each(['get', 'patch'] as const)(
        '%s /recipes/:id returns 404 with a code for a malformed id',
        async (method) => {
            const response = await request(app.getHttpServer())
                [method]('/recipes/not-a-uuid')
                .send({ title: 'Quiche' })
                .expect(404);
            const body: unknown = response.body;

            expect(body).toMatchObject({ statusCode: 404, code: 'RECIPE_NOT_FOUND' });
        },
    );

    it('GET /recipes/stream/:jobId returns 404 with a code for an unknown job', async () => {
        const response = await request(app.getHttpServer())
            .get('/recipes/stream/unknown-job')
            .expect(404);
        const body: unknown = response.body;

        expect(body).toMatchObject({ statusCode: 404, code: 'EXTRACTION_JOB_NOT_FOUND' });
    });

    it('GET /recipes/extract/cached returns the stored draft with its source URL', async () => {
        const sourceUrl = 'https://www.tiktok.com/@chef/video/200';
        const draft = {
            title: 'Tarte',
            description: null,
            basePortions: 4,
            instructions: ['Cuire 30 min'],
            ingredients: [{ name: 'Farine', quantity: 200, unit: 'g' }],
            category: 'dessert',
        };
        await app.get(PrismaService).recipeAiExtraction.create({
            data: { sourceUrl, status: 'SUCCESS', extractedData: draft },
        });

        const response = await request(app.getHttpServer())
            .get('/recipes/extract/cached')
            .query({ url: `${sourceUrl}?is_from_webapp=1` })
            .expect(200);
        const body: unknown = response.body;

        expect(body).toEqual({ ...draft, sourceUrl });
    });

    it('GET /recipes/extract/cached returns 404 with a code for a URL never extracted', async () => {
        const response = await request(app.getHttpServer())
            .get('/recipes/extract/cached')
            .query({ url: 'https://www.tiktok.com/@chef/video/404' })
            .expect(404);
        const body: unknown = response.body;

        expect(body).toMatchObject({ statusCode: 404, code: 'EXTRACTION_NOT_FOUND' });
    });

    const validRecipe = {
        title: 'Tarte',
        description: null,
        basePortions: 4,
        instructions: ['Cuire 30 min'],
        sourceUrl: null,
        ingredients: [],
        category: 'dessert',
        imageUrl: null,
    };

    it('POST /recipes returns 422 with a code for a blank title', async () => {
        const response = await request(app.getHttpServer())
            .post('/recipes')
            .send({ ...validRecipe, title: '   ' })
            .expect(422);
        const body: unknown = response.body;

        expect(body).toMatchObject({ statusCode: 422, code: 'INVALID_RECIPE' });
    });

    it.each(['dessert', 'poultry'])(
        'POST /recipes saves the category %j and returns it',
        async (category) => {
            const response = await request(app.getHttpServer())
                .post('/recipes')
                .send({ ...validRecipe, category })
                .expect(201);
            const body: unknown = response.body;

            expect(body).toMatchObject({ title: 'Tarte', category });
        },
    );

    it.each([
        ['an empty title', { title: '' }],
        ['an unknown category', { category: 'lucideUtensils' }],
        ['the removed icon field', { icon: 'lucideUtensils' }],
    ])('POST /recipes returns 400 for %s', async (_case, changes) => {
        await request(app.getHttpServer())
            .post('/recipes')
            .send({ ...validRecipe, ...changes })
            .expect(400);
    });

    it('PATCH /recipes/:id with a null description clears it', async () => {
        const recipe = aRecipe({ description: 'Classique' });
        await app.get<RecipeRepository>(RECIPE_REPOSITORY).save(recipe);

        const response = await request(app.getHttpServer())
            .patch(`/recipes/${recipe.id}`)
            .send({ description: null })
            .expect(200);
        const body: unknown = response.body;

        expect(body).toMatchObject({ id: recipe.id, description: null });
    });

    it.each([
        ['a null title', { title: null }],
        ['an empty title', { title: '' }],
        ['a null basePortions', { basePortions: null }],
        ['a decimal basePortions', { basePortions: 2.5 }],
        ['a null instructions', { instructions: null }],
        ['a null ingredients', { ingredients: null }],
        ['a null category', { category: null }],
        ['an unknown category', { category: 'cake' }],
        ['a sourceUrl (the link is set by the import only)', { sourceUrl: 'https://x.y/1' }],
    ])('PATCH /recipes/:id returns 400 for %s', async (_case, changes) => {
        await request(app.getHttpServer()).patch(`/recipes/${unknownId}`).send(changes).expect(400);
    });
});
