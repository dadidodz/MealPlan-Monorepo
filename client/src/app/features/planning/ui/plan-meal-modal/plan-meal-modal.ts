import {
    afterNextRender,
    afterRenderEffect,
    Component,
    ElementRef,
    input,
    model,
    output,
    viewChild,
} from '@angular/core';
import { FieldTree, FormField, FormRoot } from '@angular/forms/signals';
import { FieldErrors } from '../../../../shared/ui/field-errors/field-errors';
import { Icon } from '../../../../shared/ui/icon/icon';
import { RecipeLightResponse } from '../../../recipe/model/recipe.type';
import { RecipePicker } from '../../../recipe/ui/recipe-picker/recipe-picker';
import { emptyPlanMealForm, PlanMealFormModel } from '../../model/plan-meal-form';

/** Plans a meal in two steps: pick a recipe, then the number of people. The page owns the form and its submission. */
@Component({
    selector: 'app-plan-meal-modal',
    imports: [FormField, FormRoot, FieldErrors, Icon, RecipePicker],
    templateUrl: './plan-meal-modal.html',
})
export class PlanMealModal {
    /** The slot in words, such as "le midi du lundi 2 nov.". */
    readonly slotDescription = input.required<string>();
    readonly planForm = input.required<FieldTree<PlanMealFormModel>>();
    /** A failed submission. Shown here: a toast would stay behind a modal dialog, in the page below it. */
    readonly error = model<string>();

    /** The dialog was closed by the user (close button, Esc); the focus is back on what opened it. */
    readonly closed = output();

    private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
    private readonly closeButton = viewChild.required<ElementRef<HTMLElement>>('closeButton');
    private readonly peopleInput = viewChild<ElementRef<HTMLInputElement>>('peopleInput');

    constructor() {
        afterNextRender(() => this.dialog().nativeElement.showModal());

        // The previous step's content is gone with its focus: moves it to the people field, or back to the top
        afterRenderEffect(() => {
            const peopleInput = this.peopleInput()?.nativeElement;
            if (peopleInput) {
                peopleInput.focus();
                peopleInput.select();
            } else {
                this.closeButton().nativeElement.focus();
            }
        });
    }

    protected close(): void {
        this.dialog().nativeElement.close();
    }

    protected pickRecipe(recipe: RecipeLightResponse): void {
        this.planForm()().reset({ recipe, peopleCount: recipe.basePortions });
    }

    protected changeRecipe(): void {
        this.error.set(undefined);
        this.planForm()().reset(emptyPlanMealForm());
    }
}
