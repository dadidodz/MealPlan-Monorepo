import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { axeViolations } from '../testing/axe';
import { hostElement } from '../testing/host-element';
import { App } from './app';
import { ApiRoutes } from './core/config/api.routes';
import { RecipeBook } from './pages/recipe-book/recipe-book';
import { ThemeStore } from './shared/ui/theme-store';
import { ToastStore } from './shared/ui/toast-store';

describe('App', () => {
    let fixture: ComponentFixture<App>;
    let httpTesting: HttpTestingController;

    // jsdom has no IntersectionObserver (used by the recipe book's infinite scroll)
    class FakeIntersectionObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
    }

    beforeEach(async () => {
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{ path: 'recipes', component: RecipeBook }]),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(App);
        await fixture.whenStable();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const host = (): HTMLElement => hostElement(fixture);
    const fab = (): HTMLButtonElement | null =>
        host().querySelector<HTMLButtonElement>('button[aria-label="Nouvelle recette"]');
    const importDialogOpen = (): boolean =>
        host().querySelector('app-import-recipe dialog')?.classList.contains('modal-open') ?? false;
    const buttonWithText = (text: string): HTMLButtonElement | undefined =>
        Array.from(host().querySelectorAll('button')).find((b) => b.textContent?.includes(text));

    it('shows the app name without taking the h1 of the page', () => {
        expect(host().textContent).toContain('MealPlan');
        expect(host().querySelector('h1')).toBeNull();
    });

    it('links to the recipe book, planning and shopping list', () => {
        const hrefs = Array.from(host().querySelectorAll('a[href]'), (a) => a.getAttribute('href'));
        expect(hrefs).toEqual(expect.arrayContaining(['/recipes', '/planner', '/courses']));
    });

    it('opens the import modal from the button and hides the button while it is open', async () => {
        expect(importDialogOpen()).toBe(false);

        fab()?.click();
        await fixture.whenStable();

        expect(importDialogOpen()).toBe(true);
        expect(fab()).toBeNull();
    });

    it('closes the import modal and shows the button again', async () => {
        fab()?.click();
        await fixture.whenStable();

        host()
            .querySelector<HTMLButtonElement>('app-import-recipe form[method="dialog"] button')
            ?.click();
        await fixture.whenStable();

        expect(importDialogOpen()).toBe(false);
        expect(fab()).not.toBeNull();
    });

    it('reloads the recipe book after a recipe is created in the import modal', async () => {
        const listRequests = (): ReturnType<HttpTestingController['match']> =>
            httpTesting.match((req) => req.method === 'GET' && req.url === ApiRoutes.RECIPES.BASE);

        await TestBed.inject(Router).navigateByUrl('/recipes');
        TestBed.tick();
        const firstLoad = listRequests();
        expect(firstLoad).toHaveLength(1);
        firstLoad[0].flush([]);

        fab()?.click();
        await fixture.whenStable();
        buttonWithText('Créer manuellement')?.click();
        await fixture.whenStable();

        // Fill the manual form with a valid recipe and submit it
        const title = host().querySelector<HTMLInputElement>(
            'app-recipe-editor input[type="text"]',
        );
        if (!title) throw new Error('Title input not found');
        title.value = 'Omelette';
        title.dispatchEvent(new Event('input'));
        buttonWithText('Ajouter une étape')?.click();
        await fixture.whenStable();
        const step = host().querySelectorAll<HTMLTextAreaElement>('app-recipe-editor textarea')[1];
        step.value = 'Battre les œufs';
        step.dispatchEvent(new Event('input'));
        await fixture.whenStable();
        host()
            .querySelector('app-recipe-editor')
            ?.closest('form')
            ?.dispatchEvent(new Event('submit', { cancelable: true }));
        await Promise.resolve();
        TestBed.tick();

        httpTesting
            .expectOne((req) => req.method === 'POST' && req.url === ApiRoutes.RECIPES.BASE)
            .flush({ id: '42' });
        // Not whenStable(): the merge request (page 1 again) stays pending until flushed
        TestBed.tick();

        expect(listRequests()).toHaveLength(1);
    });

    describe('mobile theme menu', () => {
        const header = (): HTMLElement => {
            const found = host().querySelector('header');
            if (!found) throw new Error('Mobile header not found');
            return found;
        };
        const menuOpen = (): boolean => header().textContent?.includes('Choisir un thème') ?? false;
        const themeEntry = (label: string): HTMLElement | undefined =>
            Array.from(header().querySelectorAll<HTMLElement>('li a, li button')).find(
                (entry) => entry.textContent?.trim() === label,
            );

        beforeEach(async () => {
            header().querySelector('button')?.click();
            await fixture.whenStable();
        });

        // ThemeStore saves the theme in localStorage, which jsdom keeps for the whole file
        afterEach(() => localStorage.removeItem('theme'));

        it('applies the picked theme and closes', async () => {
            expect(menuOpen()).toBe(true);

            themeEntry('Dracula')?.click();
            await fixture.whenStable();

            expect(TestBed.inject(ThemeStore).currentTheme()).toBe('dracula');
            expect(menuOpen()).toBe(false);
        });

        it('closes on a tap outside', async () => {
            header().querySelector<HTMLElement>('.fixed.inset-0')?.click();
            await fixture.whenStable();

            expect(menuOpen()).toBe(false);
        });
    });

    describe('toasts', () => {
        let toastStore: ToastStore;

        beforeEach(() => {
            vi.useFakeTimers();
            toastStore = TestBed.inject(ToastStore);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        /** Texts of the toasts on screen, top to bottom. */
        const toastTexts = (): string[] => {
            fixture.detectChanges();
            return Array.from(host().querySelectorAll('.toast .alert'), (el) =>
                (el.textContent ?? '').trim(),
            );
        };

        it('shows a toast for 3 seconds', () => {
            toastStore.success('Recette ajoutée');
            expect(toastTexts()).toEqual(['Recette ajoutée']);

            vi.advanceTimersByTime(3000);
            expect(toastTexts()).toEqual([]);
        });

        it('keeps a second toast for its full 3 seconds', () => {
            toastStore.success('Première');
            vi.advanceTimersByTime(2000);
            toastStore.error('Deuxième');

            vi.advanceTimersByTime(1500);
            expect(toastTexts()).toEqual(['Deuxième']);

            vi.advanceTimersByTime(1500);
            expect(toastTexts()).toEqual([]);
        });

        it('stacks toasts with the newest on top', () => {
            toastStore.success('Première');
            toastStore.error('Deuxième');

            expect(toastTexts()).toEqual(['Deuxième', 'Première']);
        });

        it('shows at most 3 toasts, dropping the oldest', () => {
            for (let i = 1; i <= 4; i++) toastStore.success(`Toast ${i}`);

            expect(toastTexts()).toEqual(['Toast 4', 'Toast 3', 'Toast 2']);
        });

        it('dismisses a toast when it is tapped', () => {
            toastStore.success('Première');
            toastStore.error('Deuxième');
            fixture.detectChanges();

            host().querySelector<HTMLButtonElement>('.toast .alert')?.click();

            expect(toastTexts()).toEqual(['Première']);
        });

        it('hides all but the newest toast on phones', () => {
            toastStore.success('Première');
            toastStore.error('Deuxième');
            fixture.detectChanges();

            // jsdom has no media queries: check the phone-only class instead
            const hiddenOnPhones = Array.from(host().querySelectorAll('.toast .alert'), (el) =>
                el.classList.contains('max-md:hidden'),
            );
            expect(hiddenOnPhones).toEqual([false, true]);
        });
    });

    // Last on purpose: run before the import modal tests, it made them fail (the modal's deferred chunk, prefetched
    // on idle while axe runs, is then not awaited by whenStable() — suspected, not proven)
    it('has no accessibility violations', async () => {
        expect(await axeViolations(host())).toEqual([]);
    });
});
