import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { resetDatabase } from './support/reset-database';

describe('Ingredients (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    const flourId = '00000000-0000-4000-8000-000000000001';
    const wholeFlourId = '00000000-0000-4000-8000-000000000002';

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
        prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
        await resetDatabase(prisma);
        await prisma.ingredient.createMany({
            data: [
                { id: flourId, name: 'Farine', code: 'farine' },
                { id: wholeFlourId, name: 'Farine complète', code: 'farine-complete' },
                { name: 'Sel', code: 'sel' },
            ],
        });
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /ingredients/search returns the ingredients whose code contains the query', async () => {
        const response = await request(app.getHttpServer())
            .get('/ingredients/search?q=Far')
            .expect(200);
        const body: unknown = response.body;

        expect(body).toEqual([
            { id: flourId, name: 'Farine', code: 'farine', category: null },
            {
                id: wholeFlourId,
                name: 'Farine complète',
                code: 'farine-complete',
                category: null,
            },
        ]);
    });

    it('GET /ingredients/search returns nothing for a query under 2 characters', async () => {
        const response = await request(app.getHttpServer())
            .get('/ingredients/search?q=f')
            .expect(200);
        const body: unknown = response.body;

        expect(body).toEqual([]);
    });
});
