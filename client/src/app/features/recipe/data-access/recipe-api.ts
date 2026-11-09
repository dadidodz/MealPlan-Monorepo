import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
    RecipeCreatedResponse,
    RecipeLightResponse,
    RecipePayload,
    RecipeResponse,
} from '../model/recipe.type';
import { ApiRoutes } from '../../../core/config/api.routes';

@Injectable({
    providedIn: 'root',
})
export class RecipeApi {
    private readonly http = inject(HttpClient);
    private readonly changes = signal(0);

    /** Incremented after each recipe creation: recipe lists read it to show the new recipe. */
    public readonly revision = this.changes.asReadonly();

    /** The source link is only set here: the API refuses it on update. */
    public createRecipe(
        payload: RecipePayload & { sourceUrl: string | null },
    ): Observable<RecipeCreatedResponse> {
        return this.http
            .post<RecipeCreatedResponse>(ApiRoutes.RECIPES.BASE, payload)
            .pipe(tap(() => this.changes.update((n) => n + 1)));
    }

    /** One page of the recipe list, fetched again whenever the signal behind `page` changes (even to the same number). */
    public list(
        page: () => number,
        limit: number,
    ): HttpResourceRef<RecipeLightResponse[] | undefined> {
        return httpResource<RecipeLightResponse[]>(() => ({
            url: ApiRoutes.RECIPES.BASE,
            params: { page: page(), limit },
        }));
    }

    /** The full recipe, fetched again when `id()` changes. */
    public getById(id: () => string): HttpResourceRef<RecipeResponse | undefined> {
        return httpResource<RecipeResponse>(() => ApiRoutes.RECIPES.BY_ID(id()));
    }

    public update(id: string, payload: RecipePayload): Observable<RecipeResponse> {
        return this.http.patch<RecipeResponse>(ApiRoutes.RECIPES.BY_ID(id), payload);
    }
}
