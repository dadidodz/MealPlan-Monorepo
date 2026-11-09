import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeApi } from '../../features/recipe/data-access/recipe-api';
import { RecipeIngredientResponse } from '../../features/recipe/model/recipe.type';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { Icon } from '../../shared/ui/icon/icon';

type IngredientOrder = 'recipe' | 'alphabetical';

@Component({
    selector: 'app-recipe-detail',
    imports: [RouterLink, Icon, ErrorState],
    templateUrl: './recipe-detail.html',
})
export class RecipeDetail {
    private readonly recipeApi = inject(RecipeApi);

    /** Route parameter `:id`, bound by `withComponentInputBinding()`. */
    readonly id = input.required<string>();

    protected readonly recipe = this.recipeApi.getById(this.id);

    /** Not remembered between visits: each recipe opens in its own order. */
    protected readonly ingredientOrder = signal<IngredientOrder>('recipe');

    protected readonly ingredients = computed((): RecipeIngredientResponse[] => {
        if (!this.recipe.hasValue()) return [];
        const ingredients = this.recipe.value().ingredients;
        if (this.ingredientOrder() === 'recipe') return ingredients;
        // French collation, case and accents ignored: "échalote" sorts with the E's, not after Z
        return [...ingredients].sort((a, b) =>
            a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
        );
    });
}
