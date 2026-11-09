import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { axeViolations } from '../../../testing/axe';
import { hostElement } from '../../../testing/host-element';
import { ApiRoutes } from '../../core/config/api.routes';
import { RecipeApi } from '../../features/recipe/data-access/recipe-api';
import { RecipeLightResponse } from '../../features/recipe/model/recipe.type';
import { RecipeBook } from './recipe-book';

const PAGE_SIZE = 25;

function recipes(count: number, from = 0): RecipeLightResponse[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `recipe-${from + i}`,
        title: `Recette ${from + i}`,
        description: null,
        basePortions: 4,
        category: 'soup',
        imageUrl: null,
        createdAt: '2026-10-08T10:00:00.000Z',
        updatedAt: '2026-10-08T10:00:00.000Z',
    }));
}

/**
 * jsdom has no IntersectionObserver. Like the real one, this reports the sentinel's visibility asynchronously when
 * it starts observing, and when the user scrolls (`scrollTo`). `visible` alone changes it without a report, like
 * a layout change does.
 */
class FakeIntersectionObserver {
    static last: FakeIntersectionObserver | undefined;
    static visible = false;

    constructor(private readonly callback: IntersectionObserverCallback) {
        FakeIntersectionObserver.last = this;
    }

    observe = vi.fn(() => queueMicrotask(() => this.report()));
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);

    static scrollTo(visible: boolean): void {
        const observer = FakeIntersectionObserver.last;
        if (!observer) throw new Error('No IntersectionObserver created');
        FakeIntersectionObserver.visible = visible;
        observer.report();
    }

    private report(): void {
        const isIntersecting = FakeIntersectionObserver.visible;
        const rect = document.body.getBoundingClientRect();
        const entry: IntersectionObserverEntry = {
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: null,
            target: document.body,
            time: 0,
        };
        this.callback([entry], {
            root: null,
            rootMargin: '',
            scrollMargin: '',
            thresholds: [],
            observe: () => undefined,
            unobserve: () => undefined,
            disconnect: () => undefined,
            takeRecords: () => [],
        });
    }
}

describe('RecipeBook', () => {
    let fixture: ComponentFixture<RecipeBook>;
    let httpTesting: HttpTestingController;

    function text(): string {
        return hostElement(fixture).textContent ?? '';
    }

    function cardCount(): number {
        return hostElement(fixture).querySelectorAll('app-recipe-card').length;
    }

    async function flushPage(page: number, body: RecipeLightResponse[]): Promise<void> {
        httpTesting
            .expectOne(
                (req) =>
                    req.url === ApiRoutes.RECIPES.BASE &&
                    req.params.get('page') === String(page) &&
                    req.params.get('limit') === String(PAGE_SIZE),
            )
            .flush(body);
        await settle(); // the page is rendered
        await settle(); // the sentinel's visibility is reported
    }

    /** Creates a recipe through the API, as the import modal does. */
    function createRecipe(): void {
        TestBed.inject(RecipeApi)
            .createRecipe({
                title: 'Nouvelle',
                description: null,
                basePortions: 2,
                ingredients: [],
                instructions: [],
                category: 'soup',
                sourceUrl: null,
            })
            .subscribe();
        httpTesting.expectOne({ method: 'POST', url: ApiRoutes.RECIPES.BASE }).flush({ id: 'new' });
        TestBed.tick();
    }

    /** Not whenStable(): a page may trigger the next request, which would keep the app unstable. */
    async function settle(): Promise<void> {
        await Promise.resolve();
        TestBed.tick();
    }

    beforeEach(() => {
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
        FakeIntersectionObserver.visible = false;
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(RecipeBook);
        // Not whenStable(): a pending httpResource request keeps the app unstable until it is flushed
        TestBed.tick();
    });

    afterEach(() => {
        httpTesting.verify();
        vi.unstubAllGlobals();
    });

    it('shows a skeleton until the first page arrives', async () => {
        expect(hostElement(fixture).querySelector('.skeleton')).not.toBeNull();

        await flushPage(1, recipes(3));

        expect(hostElement(fixture).querySelector('.skeleton')).toBeNull();
        expect(cardCount()).toBe(3);
        expect(text()).toContain('Recette 0');
    });

    it('has no accessibility violations once recipes are shown', async () => {
        await flushPage(1, recipes(3));
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });

    it('shows the empty state with an import button when there is no recipe', async () => {
        await flushPage(1, []);

        expect(text()).toContain('Importer une recette');
        expect(cardCount()).toBe(0);
    });

    it('loads the next page when the scroll sentinel becomes visible', async () => {
        await flushPage(1, recipes(PAGE_SIZE));

        FakeIntersectionObserver.scrollTo(true);
        TestBed.tick();
        await flushPage(2, recipes(2, PAGE_SIZE));

        expect(cardCount()).toBe(PAGE_SIZE + 2);
    });

    it('shows the end of the book after a short page', async () => {
        await flushPage(1, recipes(3));

        FakeIntersectionObserver.scrollTo(true);
        TestBed.tick();

        expect(text()).toContain('Fin du carnet');
        httpTesting.expectNone((req) => req.params.get('page') === '2');
    });

    it('adds a created recipe on top and keeps the loaded pages', async () => {
        await flushPage(1, recipes(PAGE_SIZE));
        FakeIntersectionObserver.scrollTo(true);
        TestBed.tick();
        await flushPage(2, recipes(1, PAGE_SIZE));

        createRecipe();
        await flushPage(1, [...recipes(1, 100), ...recipes(PAGE_SIZE - 1)]);

        expect(cardCount()).toBe(PAGE_SIZE + 2);
        expect(hostElement(fixture).querySelector('app-recipe-card')?.textContent).toContain(
            'Recette 100',
        );
    });

    it('skips recipes already shown when a created recipe shifts the next page', async () => {
        await flushPage(1, recipes(PAGE_SIZE));
        createRecipe();
        await flushPage(1, [...recipes(1, 100), ...recipes(PAGE_SIZE - 1)]);

        FakeIntersectionObserver.scrollTo(true);
        TestBed.tick();
        // Offset 25 now starts with the last recipe of the first page
        await flushPage(2, recipes(PAGE_SIZE, PAGE_SIZE - 1));
        await flushPage(3, []);

        const titles = Array.from(
            hostElement(fixture).querySelectorAll('app-recipe-card'),
            (card) => card.textContent,
        );
        expect(titles).toHaveLength(1 + 2 * PAGE_SIZE - 1);
        expect(new Set(titles).size).toBe(titles.length);
    });

    it('shows an error with a retry button when loading fails', async () => {
        httpTesting
            .expectOne((req) => req.url === ApiRoutes.RECIPES.BASE)
            .flush(null, new HttpErrorResponse({ status: 500, statusText: 'Server Error' }));
        await fixture.whenStable();

        expect(text()).toContain('Réessayer');
        expect(text()).not.toContain('Votre carnet est vide');
    });

    it('keeps loading pages while the sentinel stays visible', async () => {
        FakeIntersectionObserver.scrollTo(true);
        TestBed.tick();
        await flushPage(1, recipes(PAGE_SIZE));

        await flushPage(2, recipes(1, PAGE_SIZE));

        expect(cardCount()).toBe(PAGE_SIZE + 1);
    });

    it('keeps the loaded recipes and retries when the next page fails', async () => {
        await flushPage(1, recipes(PAGE_SIZE));
        FakeIntersectionObserver.scrollTo(true);
        TestBed.tick();
        httpTesting
            .expectOne((req) => req.params.get('page') === '2')
            .flush(null, new HttpErrorResponse({ status: 500, statusText: 'Server Error' }));
        await fixture.whenStable();

        expect(cardCount()).toBe(PAGE_SIZE);
        const retry = Array.from(hostElement(fixture).querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Réessayer'),
        );
        retry?.click();
        TestBed.tick();
        await flushPage(2, recipes(1, PAGE_SIZE));

        expect(cardCount()).toBe(PAGE_SIZE + 1);
    });

    it('loads a single page when the first page pushes the sentinel off screen', async () => {
        FakeIntersectionObserver.scrollTo(true); // visible below the skeleton
        TestBed.tick();
        FakeIntersectionObserver.visible = false; // the 25 cards push it down

        await flushPage(1, recipes(PAGE_SIZE));

        httpTesting.expectNone((req) => req.params.get('page') === '2');
        expect(cardCount()).toBe(PAGE_SIZE);
    });
});
