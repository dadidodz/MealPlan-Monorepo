import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CreatePlannedMeal } from '@mealplan/shared';
import { firstValueFrom } from 'rxjs';
import { provideHttpClientOnPrism } from '../../../../testing/prism';
import { toUserMessage } from '../../../core/http/to-user-message';
import { PlannedMealApi } from './planned-meal-api';

// Against the Prism mock of contracts/openapi.yaml: requests the contract refuses fail, responses come from it
const burgerDinner: CreatePlannedMeal = {
    date: '2026-11-02',
    mealType: 'DINNER',
    recipeId: '3f2b8c1e-5d4a-4e7b-9c6f-1a2b3c4d5e6f',
    peopleCount: 4,
};

function setUp(prefer?: string): PlannedMealApi {
    TestBed.configureTestingModule({ providers: [provideHttpClientOnPrism(prefer)] });
    return TestBed.inject(PlannedMealApi);
}

async function failureOf(request: Promise<unknown>): Promise<HttpErrorResponse> {
    try {
        await request;
    } catch (error: unknown) {
        if (error instanceof HttpErrorResponse) return error;
        throw error;
    }
    throw new Error('The request succeeded');
}

describe('PlannedMealApi on the contract', () => {
    it('reads the meals of a week in the contract shape', async () => {
        const api = setUp();
        const meals = runInInjectionContext(TestBed.inject(Injector), () =>
            api.listBetween(
                () => '2026-11-02',
                () => '2026-11-08',
            ),
        );

        await TestBed.inject(ApplicationRef).whenStable();

        expect(meals.error()).toBeUndefined();
        const meal = meals.value()?.[0];
        expect(meal?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(['LUNCH', 'DINNER']).toContain(meal?.mealType);
        expect(Number.isInteger(meal?.peopleCount)).toBe(true);
        expect(meal?.recipe.title).toEqual(expect.stringMatching(/\S/));
    });

    it('plans a meal with a body the contract accepts', async () => {
        const meal = await firstValueFrom(setUp().create(burgerDinner));

        expect(['LUNCH', 'DINNER']).toContain(meal.mealType);
        expect(meal.recipe.title).toEqual(expect.stringMatching(/\S/));
        expect(Array.isArray(meal.recipe.ingredients)).toBe(true);
    });

    it('is refused by the contract with 0 people (400), as by the API', async () => {
        const error = await failureOf(
            firstValueFrom(setUp().create({ ...burgerDinner, peopleCount: 0 })),
        );

        expect(error.status).toBe(400);
    });

    it("tells the user the slot was taken, from the contract's 409", async () => {
        const error = await failureOf(firstValueFrom(setUp('code=409').create(burgerDinner)));

        expect(error.status).toBe(409);
        expect(toUserMessage(error)).toBe("Ce créneau vient d'être pris.");
    });
});
