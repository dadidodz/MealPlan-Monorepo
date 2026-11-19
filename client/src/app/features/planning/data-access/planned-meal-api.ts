/* eslint-disable @typescript-eslint/no-unused-vars -- red TDD commit: a skeleton whose bodies come with the green commit */
import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiRoutes } from '../../../core/config/api.routes';
import type {
    CreatePlannedMeal,
    PlannedMeal,
    PlannedMealsQuery,
    PlannedMealSummary,
} from '@mealplan/shared';

@Injectable({
    providedIn: 'root',
})
export class PlannedMealApi {
    private readonly http = inject(HttpClient);

    /** The meals between two calendar days (`YYYY-MM-DD`, both included), fetched again when either changes. */
    public listBetween(
        from: () => string,
        to: () => string,
    ): HttpResourceRef<PlannedMealSummary[] | undefined> {
        return httpResource<PlannedMealSummary[]>(() => ({
            url: ApiRoutes.PLANNED_MEALS.BASE,
            params: { from: from(), to: to() } satisfies PlannedMealsQuery,
        }));
    }

    /** Plans a recipe on a slot. A slot already taken fails with a 409 `SLOT_ALREADY_TAKEN`, nothing is replaced. */
    public create(meal: CreatePlannedMeal): Observable<PlannedMeal> {
        throw new Error('Not implemented');
    }
}
