import { Component, input, model, output } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { PlanMealFormModel } from '../../model/plan-meal-form';

/** Plans a meal in two steps: pick a recipe, then the number of people. The page owns the form and its submission. */
@Component({
    selector: 'app-plan-meal-modal',
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
}
