import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DomainError } from './../src/shared/domain/domain-error';
import {
    DependenciesProbe,
    DependenciesReport,
} from './../src/shared/infrastructure/dependencies-probe';

class TestNotFoundError extends DomainError {
    readonly code = 'TEST_NOT_FOUND';
    readonly kind = 'not-found';
}

/** Test-only route: proves the global DomainErrorFilter is registered by AppModule. */
@Controller('failing')
class FailingController {
    @Get()
    fail(): never {
        throw new TestNotFoundError('Nothing here');
    }
}

describe('AppController (e2e)', () => {
    let app: INestApplication<App>;
    let dependencies: DependenciesReport;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
            controllers: [FailingController],
        })
            // No real request to TikTok, Instagram or Gemini in the tests
            .overrideProvider(DependenciesProbe)
            .useValue({ check: (): Promise<DependenciesReport> => Promise.resolve(dependencies) })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it('GET /app/health reports ok', async () => {
        const response = await request(app.getHttpServer()).get('/app/health').expect(200);
        const body: unknown = response.body;

        expect(body).toMatchObject({ status: 'ok' });
    });

    it('GET /app/health/dependencies reports ok when every host is reachable', async () => {
        dependencies = { tiktok: 'ok', instagram: 'ok', gemini: 'ok' };

        const response = await request(app.getHttpServer())
            .get('/app/health/dependencies')
            .expect(200);
        const body: unknown = response.body;

        expect(body).toEqual({ status: 'ok', dependencies });
    });

    it('GET /app/health/dependencies answers 503 when one host is unreachable', async () => {
        dependencies = { tiktok: 'ok', instagram: 'ok', gemini: 'failing' };

        const response = await request(app.getHttpServer())
            .get('/app/health/dependencies')
            .expect(503);
        const body: unknown = response.body;

        expect(body).toEqual({ status: 'failing', dependencies });
    });

    it('maps a domain error to its HTTP status with its code', async () => {
        const response = await request(app.getHttpServer()).get('/failing').expect(404);
        const body: unknown = response.body;

        expect(body).toMatchObject({ code: 'TEST_NOT_FOUND', message: 'Nothing here' });
    });

    afterEach(async () => {
        await app.close();
    });
});
