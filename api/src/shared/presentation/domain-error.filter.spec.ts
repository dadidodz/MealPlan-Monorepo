import { Controller, Get, HttpStatus, INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DomainError, DomainErrorKind } from '../domain/domain-error';
import { DomainErrorFilter } from './domain-error.filter';

class TestError extends DomainError {
    readonly code = 'TEST_ERROR';

    constructor(readonly kind: DomainErrorKind) {
        super('Something went wrong');
    }
}

let errorToThrow: DomainError = new TestError('invalid');

@Controller('failing')
class FailingController {
    @Get()
    fail(): never {
        throw errorToThrow;
    }
}

describe('DomainErrorFilter', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [FailingController],
            providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
        }).compile();
        app = moduleRef.createNestApplication({ logger: false });
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it.each<[DomainErrorKind, HttpStatus]>([
        ['not-found', HttpStatus.NOT_FOUND],
        ['invalid', HttpStatus.UNPROCESSABLE_ENTITY],
        ['conflict', HttpStatus.CONFLICT],
    ])('maps %s to %i with the code in the body', async (kind, status) => {
        errorToThrow = new TestError(kind);

        const response = await request(app.getHttpServer()).get('/failing').expect(status);
        const body: unknown = response.body;

        expect(body).toEqual({
            statusCode: status,
            message: 'Something went wrong',
            code: 'TEST_ERROR',
        });
    });
});
