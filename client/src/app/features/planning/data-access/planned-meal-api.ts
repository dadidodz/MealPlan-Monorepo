import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiRoutes } from '../../../core/config/api.routes';
import type { PlannedMealsQuery, PlannedMealSummary } from '@mealplan/shared';

@Injectable({
    providedIn: 'root',
})
export class PlannedMealApi {
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
}
