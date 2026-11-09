import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { axeViolations } from '../../../testing/axe';
import { hostElement } from '../../../testing/host-element';
import { ApiRoutes } from '../../core/config/api.routes';
import { ModalStore } from '../../shared/ui/modal-store';
import { ToastStore } from '../../shared/ui/toast-store';
import { ImportRecipe } from './import-recipe';

describe('ImportRecipe', () => {
    let fixture: ComponentFixture<ImportRecipe>;
    let httpTesting: HttpTestingController;

    function host(): HTMLElement {
        return hostElement(fixture);
    }

    function button(text: string): HTMLButtonElement {
        const found = Array.from(host().querySelectorAll('button')).find((b) =>
            b.textContent?.includes(text),
        );
        if (!found) throw new Error(`Button "${text}" not found`);
        return found;
    }

    async function type(
        field: HTMLInputElement | HTMLTextAreaElement,
        value: string,
    ): Promise<void> {
        field.value = value;
        field.dispatchEvent(new Event('input'));
        await fixture.whenStable();
    }

    function editorField<T extends Element>(selector: string, index = 0): T {
        const found = host().querySelectorAll<T>(`app-recipe-editor ${selector}`)[index];
        if (!found) throw new Error(`Editor field ${selector} #${index} not found`);
        return found;
    }

    /** The form holding the editor: around it (page-owned form) or inside it. */
    async function submit(): Promise<void> {
        const editor = host().querySelector('app-recipe-editor');
        const form = editor?.closest('form') ?? editor?.querySelector('form');
        form?.dispatchEvent(new Event('submit', { cancelable: true }));
        for (let i = 0; i < 3; i++) {
            await Promise.resolve();
            TestBed.tick();
        }
    }

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        TestBed.inject(ModalStore).openImport();
        fixture = TestBed.createComponent(ImportRecipe);
        await fixture.whenStable();
    });

    afterEach(() => httpTesting.verify());

    it('has no accessibility violations', async () => {
        expect(await axeViolations(host())).toEqual([]);
    });

    it('creates a recipe written by hand, then closes the modal', async () => {
        button('Créer manuellement').click();
        await fixture.whenStable();

        await type(editorField<HTMLInputElement>('input[type="text"]'), 'Omelette');
        await type(editorField<HTMLTextAreaElement>('textarea'), 'Rapide');
        button('Ajouter un ingrédient').click();
        await fixture.whenStable();
        // One letter: no ingredient search
        await type(editorField<HTMLInputElement>('input[placeholder="Nom de l\'ingrédient"]'), 'X');
        button('Ajouter une étape').click();
        await fixture.whenStable();
        await type(editorField<HTMLTextAreaElement>('textarea', 1), 'Battre');

        await submit();
        const create = httpTesting.expectOne({ method: 'POST', url: ApiRoutes.RECIPES.BASE });
        const body: unknown = create.request.body;
        create.flush({ id: 'new' });
        await fixture.whenStable();

        expect(body).toMatchObject({
            title: 'Omelette',
            description: 'Rapide',
            instructions: ['Battre'],
            category: 'other',
        });
        expect(TestBed.inject(ToastStore).toasts()[0]?.type).toBe('success');
        expect(TestBed.inject(ModalStore).isImportOpen()).toBe(false);
    });

    describe('extraction', () => {
        async function extract(link: string): Promise<void> {
            const input = host().querySelector<HTMLInputElement>('app-extractor-form input');
            if (!input) throw new Error('Link input not found');
            await type(input, link);
            host()
                .querySelector('app-extractor-form form')
                ?.dispatchEvent(new Event('submit', { cancelable: true }));
            await fixture.whenStable();
        }

        function expectExtract(): ReturnType<HttpTestingController['expectOne']> {
            return httpTesting.expectOne({ method: 'POST', url: ApiRoutes.RECIPES.EXTRACT });
        }

        it('offers the existing recipe of a link already imported', async () => {
            await extract('https://www.tiktok.com/@chef/video/1');
            expectExtract().flush({ alreadyExists: true, recipeId: '42' });
            await fixture.whenStable();

            expect(host().textContent).toContain('Lien déjà utilisé');
        });

        it('shows a French message when the extraction cannot start', async () => {
            await extract('https://www.tiktok.com/@chef/video/1');
            expectExtract().flush(null, { status: 500, statusText: 'Server Error' });
            await fixture.whenStable();

            expect(TestBed.inject(ToastStore).toasts()[0]?.message).toBe(
                'Le serveur a rencontré une erreur. Réessaie plus tard.',
            );
        });
    });
});
