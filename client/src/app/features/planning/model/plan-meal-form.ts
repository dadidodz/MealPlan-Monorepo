import { schema } from '@angular/forms/signals';
import { RecipeLightResponse } from '../../recipe/model/recipe.type';

export interface PlanMealFormModel {
    /** Null until a recipe is picked. */
    recipe: RecipeLightResponse | null;
    /** Null when the field is empty. */
    peopleCount: number | null;
}

export function emptyPlanMealForm(): PlanMealFormModel {
    return { recipe: null, peopleCount: null };
}

/** Same rule as the API (a meal it would refuse can't be submitted), French message. */
export const planMealFormSchema = schema<PlanMealFormModel>(() => {
    // No rule in the red TDD commit: a skeleton whose bodies come with the green commit
});
