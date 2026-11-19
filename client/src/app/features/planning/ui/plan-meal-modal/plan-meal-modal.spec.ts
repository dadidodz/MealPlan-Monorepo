import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { provideRouter } from '@angular/router';
import { axeViolations } from '../../../../../testing/axe';
import { hostElement } from '../../../../../testing/host-element';
import { ApiRoutes } from '../../../../core/config/api.routes';
import { RecipeLightResponse } from '../../../recipe/model/recipe.type';
import {
    emptyPlanMealForm,
    PlanMealFormModel,
    planMealFormSchema,
} from '../../model/plan-meal-form';
import { PlanMealModal } from './plan-meal-modal';

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

describe('PlanMealModal', () => {
    let fixture: ComponentFixture<PlanMealModal>;
    let httpTesting: HttpTestingController;
    let model: ReturnType<typeof signal<PlanMealFormModel>>;

    function button(text: string): HTMLButtonElement | undefined {
        return Array.from(hostElement(fixture).querySelectorAll('button')).find((candidate) =>
            candidate.textContent?.includes(text),
        );
    }

    function peopleInput(): HTMLInputElement | null {
        return hostElement(fixture).querySelector('input');
    }

    async function pickBurger(): Promise<void> {
        button('Burger maison')?.click();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        // jsdom has no <dialog> behaviour: opening sets `open`, closing fires the native event
        HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
            this.open = false;
            this.dispatchEvent(new Event('close'));
        };
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                observe(): void {
                    // The list has no next page in these tests
                }
                unobserve(): void {
                    // Nothing to undo
                }
                disconnect(): void {
                    // Nothing to undo
                }
            },
        );
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        model = signal<PlanMealFormModel>(emptyPlanMealForm());
        fixture = TestBed.createComponent(PlanMealModal);
        fixture.componentRef.setInput('slotDescription', 'le midi du lundi 2 nov.');
        fixture.componentRef.setInput(
            'planForm',
            form(model, planMealFormSchema, { injector: TestBed.inject(Injector) }),
        );
        TestBed.tick();
        httpTesting.expectOne(`${ApiRoutes.RECIPES.BASE}?page=1&limit=25`).flush([burger]);
        await fixture.whenStable();
    });

    afterEach(() => {
        httpTesting.verify();
        vi.unstubAllGlobals();
    });

    it('opens as a modal dialog naming the slot, on the recipe list', () => {
        const dialog = hostElement(fixture).querySelector('dialog');

        expect(dialog?.open).toBe(true);
        expect(dialog?.textContent).toContain('Planifier le midi du lundi 2 nov.');
        expect(button('Burger maison')).toBeDefined();
        expect(peopleInput()).toBeNull();
    });

    it('pre-fills the number of people with the portions of the recipe picked', async () => {
        await pickBurger();

        expect(hostElement(fixture).textContent).toContain('Burger maison');
        expect(peopleInput()?.value).toBe('2');
        expect(document.activeElement).toBe(peopleInput());
    });

    it('goes back to the recipe list', async () => {
        await pickBurger();

        button('Changer de recette')?.click();
        TestBed.tick();
        httpTesting.expectOne(`${ApiRoutes.RECIPES.BASE}?page=1&limit=25`).flush([burger]);
        await fixture.whenStable();

        expect(peopleInput()).toBeNull();
        expect(model().recipe).toBeNull();
    });

    it('clears the error shown when going back to the recipe list', async () => {
        await pickBurger();
        fixture.componentRef.setInput('error', 'Recette introuvable.');
        await fixture.whenStable();
        expect(hostElement(fixture).querySelector('[role="alert"]')?.textContent).toContain(
            'Recette introuvable.',
        );

        button('Changer de recette')?.click();
        TestBed.tick();
        httpTesting.expectOne(`${ApiRoutes.RECIPES.BASE}?page=1&limit=25`).flush([burger]);
        await fixture.whenStable();

        expect(fixture.componentInstance.error()).toBeUndefined();
    });

    it('emits closed when the dialog closes', () => {
        const closed = vi.fn();
        fixture.componentInstance.closed.subscribe(closed);

        hostElement(fixture)
            .querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')
            ?.click();

        expect(hostElement(fixture).querySelector('dialog')?.open).toBe(false);
        expect(closed).toHaveBeenCalledOnce();
    });

    it('links the validation message to the field once it is touched', async () => {
        await pickBurger();

        model.update((value) => ({ ...value, peopleCount: 101 }));
        peopleInput()?.dispatchEvent(new Event('blur'));
        await fixture.whenStable();

        const errors = hostElement(fixture).querySelector('#plan-meal-people-errors');
        expect(errors?.textContent).toContain('de 1 à 100');
        expect(peopleInput()?.getAttribute('aria-describedby')).toBe(errors?.id);
        expect(peopleInput()?.getAttribute('aria-invalid')).toBe('true');
    });

    it('has no accessibility violations on the recipe list', async () => {
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });

    it('has no accessibility violations on the number of people', async () => {
        await pickBurger();

        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });
});
