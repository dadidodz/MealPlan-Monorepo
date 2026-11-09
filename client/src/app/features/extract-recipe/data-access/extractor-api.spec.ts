import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiRoutes } from '../../../core/config/api.routes';
import { ApiError } from '../../../core/http/api-error';
import { toUserMessage } from '../../../core/http/to-user-message';
import { ExtractedRecipe, ExtractionResult } from '../model/extractor.type';
import { ExtractorApi } from './extractor-api';

const url = 'https://www.tiktok.com/@chef/video/1';

/** jsdom has no EventSource: this one lets the test send the server's messages. */
class FakeEventSource {
    static last: FakeEventSource | undefined;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: (() => void) | null = null;
    readonly close = vi.fn();

    constructor(readonly url: string) {
        FakeEventSource.last = this;
    }

    static send(data: unknown): void {
        FakeEventSource.current().onmessage?.(
            new MessageEvent('message', { data: JSON.stringify(data) }),
        );
    }

    static loseConnection(): void {
        FakeEventSource.current().onerror?.();
    }

    static current(): FakeEventSource {
        if (!FakeEventSource.last) throw new Error('No EventSource opened');
        return FakeEventSource.last;
    }
}

const draft: ExtractedRecipe = {
    title: 'Velouté',
    basePortions: 4,
    ingredients: [{ name: 'potiron', quantity: 500, unit: 'g' }],
    instructions: ['Mixer'],
    category: 'soup',
};

describe('ExtractorApi', () => {
    let api: ExtractorApi;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        vi.stubGlobal('EventSource', FakeEventSource);
        FakeEventSource.last = undefined;
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        api = TestBed.inject(ExtractorApi);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
        vi.unstubAllGlobals();
    });

    describe('extractFromUrl', () => {
        /** Starts an extraction the API runs as a new job, and returns its result. */
        function extractNewJob(): Promise<ExtractionResult> {
            const result = firstValueFrom(api.extractFromUrl(url));
            httpTesting
                .expectOne({ method: 'POST', url: ApiRoutes.RECIPES.EXTRACT })
                .flush({ alreadyExists: false, jobId: 'job-1' });
            return result;
        }

        it('returns the existing recipe of that link', async () => {
            const result = firstValueFrom(api.extractFromUrl(url));
            const request = httpTesting.expectOne({
                method: 'POST',
                url: ApiRoutes.RECIPES.EXTRACT,
            });
            expect(request.request.body).toEqual({ url });
            request.flush({ alreadyExists: true, recipeId: '42' });

            expect(await result).toEqual({ type: 'existing', recipeId: '42' });
        });

        it("follows the job's stream and returns the draft", async () => {
            const result = extractNewJob();
            expect(FakeEventSource.current().url).toBe(ApiRoutes.RECIPES.STREAM('job-1'));

            FakeEventSource.send({ status: 'success', data: draft });

            expect(await result).toEqual({ type: 'extracted', recipe: draft });
            expect(FakeEventSource.current().close).toHaveBeenCalled();
        });

        /** French text the user sees for the stream's failure. */
        async function failureMessage(result: Promise<ExtractionResult>): Promise<string> {
            const error: unknown = await result.then(
                () => undefined,
                (failure: unknown) => failure,
            );
            expect(error).toBeInstanceOf(ApiError);
            return toUserMessage(error);
        }

        it.each([
            ['EXTRACTION_FAILED', "L'IA n'a pas réussi à extraire la recette."],
            ['NOT_A_RECIPE', 'Cette vidéo ne montre pas de recette.'],
            [
                'VIDEO_DOWNLOAD_FAILED',
                'Impossible de récupérer la vidéo de ce lien. Réessaie plus tard.',
            ],
            [
                'INVALID_AI_OUTPUT',
                "L'IA a rendu une recette inutilisable. Réessaie ou crée-la à la main.",
            ],
        ])('fails with the French message of %s', async (code, message) => {
            const result = extractNewJob();
            FakeEventSource.send({ status: 'error', code, message: 'Not for users' });

            expect(await failureMessage(result)).toBe(message);
            expect(FakeEventSource.current().close).toHaveBeenCalled();
        });

        it('fails with a French message when the connection is lost', async () => {
            const result = extractNewJob();
            FakeEventSource.loseConnection();

            expect(await failureMessage(result)).toBe('Connexion perdue avec le serveur.');
            expect(FakeEventSource.current().close).toHaveBeenCalled();
        });

        it('ignores a message it does not recognise', async () => {
            const result = extractNewJob();
            FakeEventSource.send({ status: 'progress' });
            FakeEventSource.send({ status: 'success', data: draft });

            expect(await result).toEqual({ type: 'extracted', recipe: draft });
        });
    });

    describe('getCachedExtraction', () => {
        it('returns the cached draft', async () => {
            const result = firstValueFrom(api.getCachedExtraction(url));
            httpTesting.expectOne(ApiRoutes.RECIPES.CACHED(url)).flush(draft);

            expect(await result).toEqual(draft);
        });

        it('gives the category other to a draft cached before categories existed', async () => {
            const result = firstValueFrom(api.getCachedExtraction(url));
            // Shape saved by the API before A15: an icon, no category
            const oldDraft = {
                title: draft.title,
                basePortions: draft.basePortions,
                ingredients: draft.ingredients,
                instructions: draft.instructions,
                icon: 'lucideSoup',
            };
            httpTesting.expectOne(ApiRoutes.RECIPES.CACHED(url)).flush(oldDraft);

            expect((await result).category).toBe('other');
        });
    });
});
