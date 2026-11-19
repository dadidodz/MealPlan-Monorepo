import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
    TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../testing/axe';
import { hostElement } from '../../../testing/host-element';
import { ApiRoutes } from '../../core/config/api.routes';
import type { PlannedMealSummary } from '@mealplan/shared';
import { RecipeLightResponse } from '../../features/recipe/model/recipe.type';
import { ToastStore } from '../../shared/ui/toast-store';
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

    describe('planning a meal', () => {
        const week = rangeUrl('2026-11-02', '2026-11-08');
        const burger: RecipeLightResponse = {
            id: 'recipe-1',
            title: 'Burger maison',
            description: null,
            basePortions: 2,
            category: 'meat',
            imageUrl: null,
            createdAt: '2026-10-20T18:42:11.123Z',
            updatedAt: '2026-10-20T18:42:11.123Z',
        };
        const salad: PlannedMealSummary = {
            id: 'meal-2',
            date: '2026-11-02',
            mealType: 'LUNCH',
            peopleCount: 2,
            recipe: { id: 'recipe-2', title: 'Salade de tomates' },
        };

        function buttonNamed(text: string): HTMLButtonElement | undefined {
            return Array.from(host().querySelectorAll('button')).find((button) =>
                button.textContent?.includes(text),
            );
        }

        /** Opens Monday lunch's modal and picks the burger: the form is ready to submit, for 2 people. */
        async function pickBurgerOnMondayLunch(): Promise<void> {
            await open('/planner?week=2026-W45', '2026-11-02', '2026-11-08');
            host()
                .querySelector<HTMLButtonElement>(
                    'button[aria-label="Planifier le midi du lundi 2 nov."]',
                )
                ?.click();
            TestBed.tick();
            httpTesting.expectOne(`${ApiRoutes.RECIPES.BASE}?page=1&limit=25`).flush([burger]);
            await harness.fixture.whenStable();
            Array.from(host().querySelectorAll('dialog li button'))
                .find((button) => button.textContent?.includes('Burger maison'))
                ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await harness.fixture.whenStable();
        }

        /** Submits the form and returns the request sent, not answered yet. */
        function confirm(): TestRequest {
            host()
                .querySelector('dialog form')
                ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            TestBed.tick();
            return httpTesting.expectOne({
                method: 'POST',
                url: ApiRoutes.PLANNED_MEALS.BASE,
            });
        }

        /**
         * Lets the form finish its submission: `submitting()` only ends a task after the answer.
         * Not whenStable(): the week's reload may be pending, and a pending request prevents it.
         */
        async function settle(): Promise<void> {
            await new Promise((resolve) => setTimeout(resolve));
            TestBed.tick();
        }

        beforeEach(() => {
            // jsdom has no <dialog> behaviour; the picker's list has no next page in these tests
            HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
                this.open = true;
            };
            vi.stubGlobal(
                'IntersectionObserver',
                class {
                    observe(): void {
                        // Nothing to report
                    }
                    unobserve(): void {
                        // Nothing to undo
                    }
                    disconnect(): void {
                        // Nothing to undo
                    }
                },
            );
        });

        afterEach(() => vi.unstubAllGlobals());

        it('posts the slot, the recipe and the number of people', async () => {
            await pickBurgerOnMondayLunch();

            const request = confirm();

            expect(request.request.body).toEqual({
                date: '2026-11-02',
                mealType: 'LUNCH',
                recipeId: 'recipe-1',
                peopleCount: 2,
            });
            request.flush(null, { status: 500, statusText: 'Server Error' });
            await settle();
        });

        it('sends one request on a double tap', async () => {
            await pickBurgerOnMondayLunch();

            const request = confirm();
            host()
                .querySelector('dialog form')
                ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            TestBed.tick();

            httpTesting.expectNone({ method: 'POST', url: ApiRoutes.PLANNED_MEALS.BASE });
            request.flush(null, { status: 500, statusText: 'Server Error' });
            await settle();
            expect(host().querySelector('dialog')).not.toBeNull();
        });

        it('closes the modal, reloads the week and confirms once planned', async () => {
            await pickBurgerOnMondayLunch();

            confirm().flush(null, { status: 201, statusText: 'Created' });
            await settle();
            httpTesting.expectOne(week).flush([salad]);
            await harness.fixture.whenStable();

            expect(host().querySelector('dialog')).toBeNull();
            expect(host().textContent).toContain('Salade de tomates');
            expect(TestBed.inject(ToastStore).toasts()[0]?.message).toBe('Repas planifié.');
        });

        it('says so and reloads the week when the slot was taken meanwhile', async () => {
            await pickBurgerOnMondayLunch();

            confirm().flush(
                { statusCode: 409, message: 'taken', code: 'SLOT_ALREADY_TAKEN' },
                { status: 409, statusText: 'Conflict' },
            );
            await settle();
            httpTesting.expectOne(week).flush([salad]);
            await harness.fixture.whenStable();

            expect(host().querySelector('dialog')).toBeNull();
            expect(host().textContent).toContain('Salade de tomates');
            expect(TestBed.inject(ToastStore).toasts()[0]?.message).toContain(
                "Ce créneau vient d'être pris",
            );
        });

        it('keeps the modal and its values open on another error, and can try again', async () => {
            await pickBurgerOnMondayLunch();

            confirm().flush(null, { status: 500, statusText: 'Server Error' });
            await settle();

            expect(host().querySelector('[role="alert"]')?.textContent).toContain(
                'Le serveur a rencontré une erreur',
            );
            expect(host().querySelector('input')?.value).toBe('2');

            confirm().flush(null, { status: 201, statusText: 'Created' });
            await settle();
            httpTesting.expectOne(week).flush([salad]);
            await harness.fixture.whenStable();

            expect(buttonNamed('Fermer')).toBeUndefined();
            expect(host().querySelector('dialog')).toBeNull();
        });

        it('keeps the modal open on a 409 with another code', async () => {
            await pickBurgerOnMondayLunch();

            confirm().flush(
                { statusCode: 409, message: 'other', code: 'SOMETHING_ELSE' },
                { status: 409, statusText: 'Conflict' },
            );
            await settle();

            expect(host().querySelector('dialog')).not.toBeNull();
            expect(host().querySelector('[role="alert"]')).not.toBeNull();
        });

        it('shows the error as a toast when the modal was closed while saving', async () => {
            await pickBurgerOnMondayLunch();
            const request = confirm();

            host().querySelector('dialog')?.dispatchEvent(new Event('close'));
            await harness.fixture.whenStable();
            request.flush(null, { status: 500, statusText: 'Server Error' });
            await settle();

            expect(host().querySelector('dialog')).toBeNull();
            expect(TestBed.inject(ToastStore).toasts()[0]?.message).toContain(
                'Le serveur a rencontré une erreur',
            );
        });

        it('moves the focus to the day once planned', async () => {
            await pickBurgerOnMondayLunch();

            confirm().flush(null, { status: 201, statusText: 'Created' });
            await settle();
            httpTesting.expectOne(week).flush([salad]);
            await harness.fixture.whenStable();

            expect(document.activeElement?.textContent?.trim()).toBe('lundi 2 nov.');
        });

        it('has no accessibility violations with the modal open', async () => {
            await pickBurgerOnMondayLunch();

            expect(await axeViolations(hostElement(harness.fixture))).toEqual([]);
        });
    });
});
