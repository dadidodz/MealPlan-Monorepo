import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { axeViolations } from '../../../../../testing/axe';
import { hostElement } from '../../../../../testing/host-element';
import { ApiRoutes } from '../../../../core/config/api.routes';
import { RecipeLightResponse } from '../../model/recipe.type';
import { RecipePicker } from './recipe-picker';

function aRecipe(index: number): RecipeLightResponse {
    return {
        id: `recipe-${index}`,
        title: `Recette ${index}`,
        description: null,
        basePortions: 2,
        category: 'meat',
        imageUrl: null,
        createdAt: '2026-10-20T18:42:11.123Z',
        updatedAt: '2026-10-20T18:42:11.123Z',
    };
}

function aPage(first: number, length: number): RecipeLightResponse[] {
    return Array.from({ length }, (_, index) => aRecipe(first + index));
}

/** jsdom has no IntersectionObserver: reports what `visible` says when it starts observing, like the real one. */
class FakeIntersectionObserver {
    static last: FakeIntersectionObserver | undefined;
    static options: IntersectionObserverInit | undefined;

    constructor(
        private readonly callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
    ) {
        FakeIntersectionObserver.last = this;
        FakeIntersectionObserver.options = options;
    }

    observe(): void {
        // Reported by reachBottom(), when the spec decides the user scrolled
    }

    unobserve(): void {
        // Nothing to undo
    }

    disconnect(): void {
        // Nothing to undo
    }

    reachBottom(): void {
        const rect = document.body.getBoundingClientRect();
        const entry: IntersectionObserverEntry = {
            isIntersecting: true,
            intersectionRatio: 1,
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

describe('RecipePicker', () => {
    let fixture: ComponentFixture<RecipePicker>;
    let httpTesting: HttpTestingController;

    function pageUrl(page: number): string {
        return `${ApiRoutes.RECIPES.BASE}?page=${page}&limit=25`;
    }

    async function flushPage(page: number, recipes: RecipeLightResponse[]): Promise<void> {
        TestBed.tick();
        httpTesting.expectOne(pageUrl(page)).flush(recipes);
        await fixture.whenStable();
    }

    function titles(): (string | undefined)[] {
        return Array.from(hostElement(fixture).querySelectorAll('li button'), (button) =>
            button.textContent?.trim(),
        );
    }

    beforeEach(() => {
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(RecipePicker);
    });

    afterEach(() => {
        httpTesting.verify();
        vi.unstubAllGlobals();
    });

    it('shows a skeleton while the first page loads', () => {
        TestBed.tick();

        expect(hostElement(fixture).querySelector('.skeleton')).not.toBeNull();

        httpTesting.expectOne(pageUrl(1)).flush([]);
    });

    it('lists the recipes in the order of the API', async () => {
        await flushPage(1, [aRecipe(2), aRecipe(1)]);

        expect(titles()).toEqual(['Recette 2', 'Recette 1']);
    });

    it('emits the recipe picked', async () => {
        const picked = vi.fn();
        fixture.componentInstance.picked.subscribe(picked);
        await flushPage(1, [aRecipe(1)]);

        hostElement(fixture).querySelector<HTMLButtonElement>('li button')?.click();

        expect(picked).toHaveBeenCalledWith(aRecipe(1));
    });

    it('observes the bottom of its own list, which scrolls inside the modal', async () => {
        await flushPage(1, [aRecipe(1)]);

        const root = FakeIntersectionObserver.options?.root;
        expect(root).toBeInstanceOf(HTMLElement);
        expect(hostElement(fixture).contains(root ?? null)).toBe(true);
    });

    it('loads the next page at the bottom, after the recipes already listed', async () => {
        await flushPage(1, aPage(1, 25));

        FakeIntersectionObserver.last?.reachBottom();
        await flushPage(2, aPage(26, 1));

        expect(titles()).toHaveLength(26);
        expect(titles().at(-1)).toBe('Recette 26');
    });

    it('lists a recipe once when a next page repeats it', async () => {
        await flushPage(1, aPage(1, 25));

        FakeIntersectionObserver.last?.reachBottom();
        await flushPage(2, aPage(25, 2));

        expect(titles()).toHaveLength(26);
    });

    it('requests a page once while it loads', async () => {
        await flushPage(1, aPage(1, 25));

        FakeIntersectionObserver.last?.reachBottom();
        TestBed.tick();
        FakeIntersectionObserver.last?.reachBottom();
        TestBed.tick();

        const requests = httpTesting.match(pageUrl(2));
        expect(requests).toHaveLength(1);
        requests[0]?.flush([]);
    });

    it('stops at the last page, which is not full', async () => {
        await flushPage(1, aPage(1, 3));

        FakeIntersectionObserver.last?.reachBottom();
        TestBed.tick();

        expect(httpTesting.match(pageUrl(2))).toEqual([]);
    });

    it('offers a way to the book when it is empty', async () => {
        await flushPage(1, []);

        expect(hostElement(fixture).textContent).toContain('Aucune recette');
        expect(hostElement(fixture).querySelector('a')?.getAttribute('href')).toBe('/recipes');
    });

    it('keeps the listed recipes and offers a retry when a next page fails', async () => {
        await flushPage(1, aPage(1, 25));

        FakeIntersectionObserver.last?.reachBottom();
        TestBed.tick();
        httpTesting.expectOne(pageUrl(2)).flush(null, { status: 500, statusText: 'Server Error' });
        await fixture.whenStable();

        expect(hostElement(fixture).textContent).toContain('Recette 25');
        expect(hostElement(fixture).textContent).toContain('Réessayer');
    });

    it('has no accessibility violations', async () => {
        await flushPage(1, aPage(1, 3));

        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });
});
