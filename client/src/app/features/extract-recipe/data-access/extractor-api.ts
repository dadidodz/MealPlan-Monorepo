import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, switchMap } from 'rxjs';
import { ApiRoutes } from '../../../core/config/api.routes';
import { ApiError } from '../../../core/http/api-error';
import {
    ExtractedRecipe,
    ExtractionResult,
    ExtractionStartResponse,
    ExtractionStreamEvent,
} from '../model/extractor.type';
import { recipeCategoryOf } from '../../recipe/model/recipe-category';

/** Drafts cached before categories existed have none (they carry an `icon`): fall back to `other`. */
function withKnownCategory(draft: ExtractedRecipe): ExtractedRecipe {
    return { ...draft, category: recipeCategoryOf(draft.category) };
}

/** Checks the shape of a parsed stream message before trusting it (`JSON.parse` returns `any`). */
function isStreamEvent(value: unknown): value is ExtractionStreamEvent {
    if (typeof value !== 'object' || value === null || !('status' in value)) return false;
    if (value.status === 'success') {
        return 'data' in value && typeof value.data === 'object' && value.data !== null;
    }
    return value.status === 'error' && 'code' in value && typeof value.code === 'string';
}

@Injectable({
    providedIn: 'root',
})
export class ExtractorApi {
    private readonly http = inject(HttpClient);

    public extractFromUrl(url: string): Observable<ExtractionResult> {
        return this.http
            .post<ExtractionStartResponse>(ApiRoutes.RECIPES.EXTRACT, { url })
            .pipe(
                switchMap((response) =>
                    response.alreadyExists
                        ? of({ type: 'existing' as const, recipeId: response.recipeId })
                        : this.listenToExtractionStream(response.jobId).pipe(
                              map((recipe) => ({ type: 'extracted' as const, recipe })),
                          ),
                ),
            );
    }

    public getCachedExtraction(url: string): Observable<ExtractedRecipe> {
        return this.http
            .get<ExtractedRecipe>(ApiRoutes.RECIPES.CACHED(url))
            .pipe(map(withKnownCategory));
    }

    /** Fails with an `ApiError`: the job's error code, or `CONNECTION_LOST`. */
    private listenToExtractionStream(jobId: string): Observable<ExtractedRecipe> {
        return new Observable((observer) => {
            const eventSource = new EventSource(ApiRoutes.RECIPES.STREAM(jobId));

            eventSource.onmessage = (event: MessageEvent<string>) => {
                const message: unknown = JSON.parse(event.data);
                if (!isStreamEvent(message)) return;

                eventSource.close();
                if (message.status === 'success') {
                    observer.next(withKnownCategory(message.data));
                    observer.complete();
                } else {
                    observer.error(new ApiError(message.code));
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                observer.error(new ApiError('CONNECTION_LOST'));
            };

            return () => eventSource.close();
        });
    }
}
