import { Component, inject, signal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { ThemeStore } from '../../shared/ui/theme-store';
import { ToastStore } from '../../shared/ui/toast-store';
import { draftToFormModel, toPayload } from '../../features/recipe/model/recipe-form.mapper';
import { recipeFormSchema } from '../../features/recipe/model/recipe-form.schema';
import { RecipeEditor } from '../../features/recipe/ui/recipe-editor/recipe-editor';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
    selector: 'app-ui-kit',
    imports: [RecipeEditor, ErrorState, EmptyState, FormRoot],
    templateUrl: './ui-kit.html',
})
export class UiKitPage {
    protected readonly themeStore = inject(ThemeStore);
    protected readonly toastStore = inject(ToastStore);

    // Fake data to feed the editor; submitting logs what would be saved
    protected readonly mockForm = form(
        signal(
            draftToFormModel({
                title: 'Test de Stylisation',
                description: "Une recette factice pour tester l'UI.",
                basePortions: 2,
                ingredients: [{ name: 'Tomate', quantity: 3, unit: null }],
                instructions: ['Étape 1', 'Étape 2'],
                category: 'vegetarian',
            }),
        ),
        recipeFormSchema,
        {
            submission: {
                action: (mockForm) => {
                    console.log('Save requested with:', toPayload(mockForm().value()));
                    return Promise.resolve(undefined);
                },
            },
        },
    );

    protected readonly sampleError = new HttpErrorResponse({
        status: 404,
        error: { code: 'RECIPE_NOT_FOUND' },
    });

    protected onThemeChange(event: Event): void {
        if (event.target instanceof HTMLSelectElement) {
            this.themeStore.setTheme(event.target.value);
        }
    }

    protected onRetry(): void {
        console.log('Retry requested');
    }
}
