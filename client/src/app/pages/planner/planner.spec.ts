import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../testing/axe';
import { hostElement } from '../../../testing/host-element';
import { ApiRoutes } from '../../core/config/api.routes';
import type { PlannedMealSummary } from '@mealplan/shared';
import { Planner } from './planner';

const dinner: PlannedMealSummary = {
    id: 'meal-1',
    date: '2026-11-02',
    mealType: 'DINNER',
    peopleCount: 4,
    recipe: { id: 'recipe-1', title: 'Burger maison' },
};

function rangeUrl(from: string, to: string): string {
    return `${ApiRoutes.PLANNED_MEALS.BASE}?from=${from}&to=${to}`;
}

describe('Planner', () => {
    let harness: RouterTestingHarness;
    let httpTesting: HttpTestingController;

    function host(): Element {
        const element = harness.routeNativeElement;
        if (!element) throw new Error('No routed component');
        return element;
    }

    function weekLink(label: string): string | null | undefined {
        return host().querySelector(`a[aria-label="${label}"]`)?.getAttribute('href');
    }

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(
                    [{ path: 'planner', component: Planner }],
                    withComponentInputBinding(),
                ),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        harness = await RouterTestingHarness.create();
    });

    afterEach(() => {
        vi.useRealTimers();
        httpTesting.verify();
    });

    /** Not harness.navigateByUrl(): it waits for stability, and a pending httpResource request prevents it. */
    async function navigate(url: string): Promise<void> {
        await TestBed.inject(Router).navigateByUrl(url);
        TestBed.tick();
    }

    /** Opens the URL and answers the week's request. */
    async function open(url: string, from: string, to: string): Promise<void> {
        await navigate(url);
        httpTesting.expectOne(rangeUrl(from, to)).flush([dinner]);
        await harness.fixture.whenStable();
    }

    it('shows the meals of the week in the URL', async () => {
        await open('/planner?week=2026-W45', '2026-11-02', '2026-11-08');

        expect(host().textContent).toContain('lundi 2 nov.');
        expect(host().textContent).toContain('Burger maison');
    });

    it('links to the previous and next weeks', async () => {
        await open('/planner?week=2026-W45', '2026-11-02', '2026-11-08');

        expect(weekLink('Semaine précédente')).toBe('/planner?week=2026-W44');
        expect(weekLink('Semaine suivante')).toBe('/planner?week=2026-W46');
    });

    it('crosses a year with the week links', async () => {
        await open('/planner?week=2026-W53', '2026-12-28', '2027-01-03');

        expect(weekLink('Semaine suivante')).toBe('/planner?week=2027-W01');
    });

    it('loads the new week when the URL changes', async () => {
        await open('/planner?week=2026-W45', '2026-11-02', '2026-11-08');

        await open('/planner?week=2026-W46', '2026-11-09', '2026-11-15');

        expect(host().textContent).toContain('lundi 9 nov.');
    });

    describe('with no valid week in the URL', () => {
        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(2026, 9, 30, 12));
        });

        it.each(['/planner', '/planner?week=abc', '/planner?week=2026-W54'])(
            'shows the current week on %s',
            async (url) => {
                await open(url, '2026-10-26', '2026-11-01');

                expect(host().textContent).toContain('lundi 26 oct.');
            },
        );
    });

    it('shows a skeleton while the week loads', async () => {
        await navigate('/planner?week=2026-W45');

        expect(host().querySelector('.skeleton')).not.toBeNull();

        httpTesting.expectOne(rangeUrl('2026-11-02', '2026-11-08')).flush([]);
    });

    it('shows the error with a retry that loads the week again', async () => {
        await navigate('/planner?week=2026-W45');
        httpTesting
            .expectOne(rangeUrl('2026-11-02', '2026-11-08'))
            .flush(null, { status: 500, statusText: 'Server Error' });
        await harness.fixture.whenStable();

        expect(host().textContent).toContain('Réessayer');

        const retry = Array.from(host().querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Réessayer'),
        );
        retry?.click();
        TestBed.tick();
        httpTesting.expectOne(rangeUrl('2026-11-02', '2026-11-08')).flush([dinner]);
        await harness.fixture.whenStable();

        expect(host().textContent).toContain('Burger maison');
    });

    it('has no accessibility violations', async () => {
        await open('/planner?week=2026-W45', '2026-11-02', '2026-11-08');

        expect(await axeViolations(hostElement(harness.fixture))).toEqual([]);
    });
});
