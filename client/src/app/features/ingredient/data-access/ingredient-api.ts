import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ingredient } from '../model/ingredient.type';
import { ApiRoutes } from '../../../core/config/api.routes';

@Injectable({
    providedIn: 'root',
})
export class IngredientApi {
    private readonly http = inject(HttpClient);

    public searchIngredients(query: string): Observable<Ingredient[]> {
        const params = new HttpParams().set('q', query);

        return this.http.get<Ingredient[]>(ApiRoutes.INGREDIENTS.SEARCH, { params });
    }
}
