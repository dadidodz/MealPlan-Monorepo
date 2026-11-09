import { Component, inject, linkedSignal, signal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toUserMessage } from '../../core/http/to-user-message';
import { ExtractorForm } from '../../features/extract-recipe/ui/extractor-form/extractor-form';
import { RecipeEditor } from '../../features/recipe/ui/recipe-editor/recipe-editor';
import {
    ExtractedRecipe,
    ExtractionResult,
    ExtractionStatus,
} from '../../features/extract-recipe/model/extractor.type';
import { ExtractorApi } from '../../features/extract-recipe/data-access/extractor-api';
import { RecipeApi } from '../../features/recipe/data-access/recipe-api';
import { draftToFormModel, toPayload } from '../../features/recipe/model/recipe-form.mapper';
import { recipeFormSchema } from '../../features/recipe/model/recipe-form.schema';
import { RouterLink } from '@angular/router';
import { ToastStore } from '../../shared/ui/toast-store';
import { ModalStore } from '../../shared/ui/modal-store';
import { Icon } from '../../shared/ui/icon/icon';

/** Starting point of a recipe written by hand. */
const EMPTY_DRAFT: ExtractedRecipe = {
    title: '',
    description: '',
    basePortions: 4,
    instructions: [],
    ingredients: [],
    category: 'other',
};

@Component({
    selector: 'app-import-recipe',
    imports: [Icon, ExtractorForm, RecipeEditor, RouterLink, FormRoot],
    templateUrl: './import-recipe.html',
})
export class ImportRecipe {
    private readonly extractorApi = inject(ExtractorApi);
    private readonly recipeApi = inject(RecipeApi);
    private readonly toastStore = inject(ToastStore);
    protected readonly modalStore = inject(ModalStore);

    protected readonly extractedData = signal<ExtractedRecipe | null>(null);
    protected readonly status = signal<ExtractionStatus>('idle');
    protected readonly sourceUrl = signal<string | null>(null);
    protected readonly existingRecipeId = signal<string | null>(null);

    /** The draft under review, reset whenever a new draft arrives. Only rendered while there is one. */
    private readonly model = linkedSignal(() =>
        draftToFormModel(this.extractedData() ?? EMPTY_DRAFT),
    );

    protected readonly recipeForm = form(this.model, recipeFormSchema, {
        submission: {
            action: async (recipeForm) => {
                const sourceUrl = this.extractedData()?.sourceUrl ?? null;
                try {
                    await firstValueFrom(
                        this.recipeApi.createRecipe({
                            ...toPayload(recipeForm().value()),
                            sourceUrl,
                        }),
                    );
                } catch (error: unknown) {
                    // Toast only, no form error: a root submission error would keep the form invalid until a
                    // value changes, so "save" again with the same values would do nothing. The values stay.
                    this.toastStore.error(toUserMessage(error));
                    return undefined;
                }
                this.toastStore.success('Recette ajoutée à votre carnet !');
                this.closeModal();
                return undefined;
            },
        },
    });

    protected processExtraction(url: string): void {
        this.status.set('loading');
        this.sourceUrl.set(url);

        this.extractorApi.extractFromUrl(url).subscribe({
            next: (result: ExtractionResult) => {
                if (result.type === 'existing') {
                    this.existingRecipeId.set(result.recipeId);
                    this.status.set('already_exists');
                } else {
                    this.extractedData.set(result.recipe);
                    this.status.set('success');
                }
            },
            error: (error: unknown) => {
                this.status.set('error');
                this.toastStore.error(toUserMessage(error));
            },
        });
    }

    public fetchExistingExtraction(): void {
        const url = this.sourceUrl();
        if (!url) return;
        this.status.set('loading');

        this.extractorApi.getCachedExtraction(url).subscribe({
            next: (data) => {
                this.extractedData.set(data);
                this.status.set('success');
            },
            error: (error: unknown) => {
                this.status.set('error');
                this.toastStore.error(toUserMessage(error));
            },
        });
    }

    public closeModal(): void {
        this.modalStore.closeImport();

        setTimeout(() => {
            this.status.set('idle');
            this.extractedData.set(null);
            this.sourceUrl.set('');
        }, 300);
    }

    public startManualCreation(): void {
        this.sourceUrl.set('');
        this.extractedData.set(EMPTY_DRAFT);

        this.status.set('success');
    }

    public goBackToExtractor(): void {
        this.status.set('idle');

        this.extractedData.set(null);
        this.sourceUrl.set('');
    }
}
