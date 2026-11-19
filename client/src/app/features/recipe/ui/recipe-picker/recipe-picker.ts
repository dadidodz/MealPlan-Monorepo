import { Component, output } from '@angular/core';
import { RecipeLightResponse } from '../../model/recipe.type';

/** The recipe book as a list to pick from, in the book's order, loading more while scrolling. Loads its own data. */
@Component({
    selector: 'app-recipe-picker',
    templateUrl: './recipe-picker.html',
    host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class RecipePicker {
    readonly picked = output<RecipeLightResponse>();
}
