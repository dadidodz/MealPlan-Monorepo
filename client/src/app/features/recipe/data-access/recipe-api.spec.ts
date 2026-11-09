import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiRoutes } from '../../../core/config/api.routes';
import { RecipePayload, RecipeResponse } from '../model/recipe.type';
import { RecipeApi } from './recipe-api';

describe('RecipeApi', () => {
    let api: RecipeApi;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        api = TestBed.inject(RecipeApi);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    describe('update', () => {
        it('patches the recipe with the payload', async () => {
            const payload: RecipePayload = {
                title: 'Velouté',
                description: null,
                basePortions: 4,
                ingredients: [{ name: 'Sel', quantity: null, unit: null }],
                instructions: ['Mixer'],
                category: 'soup',
            };

            const done = firstValueFrom(api.update('recipe-1', payload));
            const request = httpTesting.expectOne(ApiRoutes.RECIPES.BY_ID('recipe-1'));
            request.flush({});
            await done;

            expect(request.request.method).toBe('PATCH');
            expect(request.request.body).toEqual(payload);
        });
    });

    describe('list', () => {
        it('loads the requested page as a resource', async () => {
            const ref = TestBed.runInInjectionContext(() => api.list(() => 2, 25));
            TestBed.tick();
            const request = httpTesting.expectOne((req) => req.url === ApiRoutes.RECIPES.BASE);
            expect(request.request.params.get('page')).toBe('2');
            expect(request.request.params.get('limit')).toBe('25');
            request.flush([]);
            await TestBed.inject(ApplicationRef).whenStable();

            expect(ref.value()).toEqual([]);
        });
    });

    describe('getById', () => {
        it('loads the recipe of the given id as a resource', async () => {
            const ref = TestBed.runInInjectionContext(() => api.getById(() => '42'));
            TestBed.tick();
            const recipe: RecipeResponse = {
                id: '42',
                title: 'Velouté',
                description: null,
                basePortions: 4,
                instructions: ['Mixer'],
                sourceUrl: null,
                ingredients: [],
                category: 'soup',
                imageUrl: null,
                createdAt: '2026-10-08T10:00:00.000Z',
                updatedAt: '2026-10-08T10:00:00.000Z',
            };
            httpTesting.expectOne(ApiRoutes.RECIPES.BY_ID('42')).flush(recipe);
            await TestBed.inject(ApplicationRef).whenStable();

            expect(ref.value()).toEqual(recipe);
        });
    });
});
