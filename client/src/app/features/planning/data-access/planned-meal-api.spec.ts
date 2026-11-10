import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiRoutes } from '../../../core/config/api.routes';
import type { PlannedMealSummary } from '@mealplan/shared';
import { PlannedMealApi } from './planned-meal-api';

const meal: PlannedMealSummary = {
    id: 'meal-1',
    date: '2026-11-02',
    mealType: 'DINNER',
    peopleCount: 4,
    recipe: { id: 'recipe-1', title: 'Burger maison' },
};

describe('PlannedMealApi', () => {
    let api: PlannedMealApi;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        api = TestBed.inject(PlannedMealApi);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('loads the meals of the range', async () => {
        const meals = TestBed.runInInjectionContext(() =>
            api.listBetween(
                () => '2026-11-02',
                () => '2026-11-08',
            ),
        );
        TestBed.tick();

        httpTesting
            .expectOne(`${ApiRoutes.PLANNED_MEALS.BASE}?from=2026-11-02&to=2026-11-08`)
            .flush([meal]);
        await TestBed.inject(ApplicationRef).whenStable();

        expect(meals.value()).toEqual([meal]);
    });
});
