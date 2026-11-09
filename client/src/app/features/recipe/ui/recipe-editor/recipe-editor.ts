import { Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FieldTree, FormField } from '@angular/forms/signals';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TextFieldModule } from '@angular/cdk/text-field';
import { catchError, debounceTime, filter, map, of, switchMap } from 'rxjs';
import { ExtractionStatus } from '../../../extract-recipe/model/extractor.type';
import { IngredientApi } from '../../../ingredient/data-access/ingredient-api';
import { Ingredient } from '../../../ingredient/model/ingredient.type';
import { FieldErrors } from '../../../../shared/ui/field-errors/field-errors';
import { Icon, IconName } from '../../../../shared/ui/icon/icon';
import {
    CATEGORY_ICONS,
    CATEGORY_LABELS,
    RECIPE_CATEGORIES,
    RecipeCategory,
} from '../../model/recipe-category';
import { capitalize } from '../../model/recipe-form.mapper';
import { RecipeFormModel } from '../../model/recipe-form.type';

export const ALLOWED_UNITS = ['g', 'kg', 'ml', 'cl', 'L', 'càc', 'càs', 'pincée'];

/** Renders the fields of a recipe form owned by the page; the page's `<form [formRoot]>` handles the submit. */
@Component({
    selector: 'app-recipe-editor',
    imports: [FormField, FieldErrors, Icon, DragDropModule, TextFieldModule],
    templateUrl: './recipe-editor.html',
})
export class RecipeEditor {
    private readonly ingredientApi = inject(IngredientApi);

    readonly recipeForm = input.required<FieldTree<RecipeFormModel>>();
    readonly extractStatus = input<ExtractionStatus>('idle');

    readonly backRequested = output();

    protected readonly activeDropdownIndex = signal<number | null>(null);
    protected readonly isSearching = signal<boolean>(false);
    protected readonly searchResults = signal<Ingredient[]>([]);
    protected readonly isCategoryPickerOpen = signal(false);

    /** Latest ingredient name typed, with its row: feeds the debounced search. */
    private readonly searchRequest = signal<{ index: number; term: string } | null>(null);

    protected readonly categories = RECIPE_CATEGORIES;
    protected readonly categoryIcons = CATEGORY_ICONS;
    protected readonly categoryLabels = CATEGORY_LABELS;
    protected readonly allowedUnits = ALLOWED_UNITS;

    constructor() {
        this.listenToSearches();
    }

    private listenToSearches(): void {
        toObservable(this.searchRequest)
            .pipe(
                filter((request) => request !== null),
                // No distinctUntilChanged: coming back to a field must search again for the same term
                debounceTime(300),
                switchMap(({ index, term }) => {
                    if (term.trim().length < 2) {
                        return of({ index, results: [] });
                    }

                    this.isSearching.set(true);

                    return this.ingredientApi.searchIngredients(term).pipe(
                        map((results) => ({ index, results })),
                        // A failed search shows no suggestion but keeps the stream alive for the next one
                        catchError(() => of({ index, results: [] })),
                    );
                }),
                takeUntilDestroyed(),
            )
            .subscribe(({ index, results }) => {
                // Ignore answers for a field that is no longer active (onInputBlur already stopped its spinner)
                if (this.activeDropdownIndex() === index) {
                    this.searchResults.set(results);
                    this.isSearching.set(false);
                }
            });
    }

    protected onSearchInput(event: Event, index: number): void {
        if (!(event.target instanceof HTMLInputElement)) return;
        const term = event.target.value;

        this.activeDropdownIndex.set(index);

        if (term.trim().length < 2) {
            this.searchResults.set([]);
            this.isSearching.set(false);
        } else {
            this.isSearching.set(true);
            this.searchRequest.set({ index, term });
        }
    }

    // Coming back to a field that already has 2+ characters searches again
    protected onInputFocus(event: Event, index: number): void {
        this.onSearchInput(event, index);
    }

    protected onInputBlur(): void {
        this.activeDropdownIndex.set(null);
        // Leaving the field ends its search for the user: no spinner nor suggestions left for the next field
        this.isSearching.set(false);
        this.searchResults.set([]);
    }

    protected selectIngredient(ingredient: Ingredient, index: number): void {
        const name = capitalize(ingredient.name);
        this.recipeForm()
            .ingredients()
            .value.update((list) => list.map((row, i) => (i === index ? { ...row, name } : row)));

        this.activeDropdownIndex.set(null);
        this.searchResults.set([]);
    }

    protected addIngredient(): void {
        this.recipeForm()
            .ingredients()
            .value.update((list) => [...list, { name: '', quantity: null, unit: '' }]);
    }

    protected removeIngredient(index: number): void {
        this.recipeForm()
            .ingredients()
            .value.update((list) => list.filter((_, i) => i !== index));
    }

    protected addInstruction(): void {
        this.recipeForm()
            .instructions()
            .value.update((list) => [...list, '']);
    }

    protected removeInstruction(index: number): void {
        this.recipeForm()
            .instructions()
            .value.update((list) => list.filter((_, i) => i !== index));
    }

    protected onDropInstruction(event: CdkDragDrop<unknown>): void {
        this.recipeForm()
            .instructions()
            .value.update((list) => {
                const steps = [...list];
                moveItemInArray(steps, event.previousIndex, event.currentIndex);
                return steps;
            });
    }

    protected onBackClick(): void {
        this.backRequested.emit();
    }

    protected selectedCategory(): RecipeCategory {
        return this.recipeForm().category().value();
    }

    protected selectedCategoryIcon(): IconName {
        return CATEGORY_ICONS[this.selectedCategory()];
    }

    protected toggleCategoryPicker(): void {
        this.isCategoryPickerOpen.update((open) => !open);
    }

    protected selectCategory(category: RecipeCategory): void {
        this.recipeForm().category().value.set(category);
        this.isCategoryPickerOpen.set(false); // Close the grid after picking
    }
}
