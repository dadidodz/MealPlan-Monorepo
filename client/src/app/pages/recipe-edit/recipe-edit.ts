import { Component, inject, input, linkedSignal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toUserMessage } from '../../core/http/to-user-message';
import { RecipeApi } from '../../features/recipe/data-access/recipe-api';
import { toFormModel, toPayload } from '../../features/recipe/model/recipe-form.mapper';
import { recipeFormSchema } from '../../features/recipe/model/recipe-form.schema';
import { RecipeFormModel } from '../../features/recipe/model/recipe-form.type';
import { RecipeEditor } from '../../features/recipe/ui/recipe-editor/recipe-editor';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { ToastStore } from '../../shared/ui/toast-store';

const EMPTY_FORM: RecipeFormModel = {
    title: '',
    description: '',
    basePortions: 1,
    category: 'other',
    ingredients: [],
    instructions: [],
};

@Component({
    selector: 'app-recipe-edit',
    imports: [RecipeEditor, ErrorState, FormRoot],
    templateUrl: './recipe-edit.html',
})
export class RecipeEdit {
    private readonly router = inject(Router);
    private readonly recipeApi = inject(RecipeApi);
    private readonly toastStore = inject(ToastStore);

    /** Route parameter `:id`, bound by `withComponentInputBinding()`. */
    readonly id = input.required<string>();

    protected readonly recipe = this.recipeApi.getById(this.id);

    /** Editable copy, reset when the loaded recipe changes. Only rendered once the recipe is there. */
    private readonly model = linkedSignal<RecipeFormModel>(() =>
        this.recipe.hasValue() ? toFormModel(this.recipe.value()) : EMPTY_FORM,
    );

    protected readonly recipeForm = form(this.model, recipeFormSchema, {
        submission: {
            action: async (recipeForm) => {
                try {
                    await firstValueFrom(
                        this.recipeApi.update(this.id(), toPayload(recipeForm().value())),
                    );
                } catch (error: unknown) {
                    // Toast only, no form error: a root submission error would keep the form invalid until a
                    // value changes, so "save" again with the same values would do nothing. The values stay.
                    this.toastStore.error(toUserMessage(error));
                    return undefined;
                }
                this.toastStore.success('Modifications enregistrées !');
                await this.goBack();
                return undefined;
            },
        },
    });

    protected goBack(): Promise<boolean> {
        return this.router.navigate(['/recipes', this.id()]);
    }
}
