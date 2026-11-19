import { schema, validate } from '@angular/forms/signals';
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
export const planMealFormSchema = schema<PlanMealFormModel>((meal) => {
    validate(meal.peopleCount, ({ value }) => {
        const people = value();
        return Number.isInteger(people) && people !== null && people >= 1 && people <= 100
            ? undefined
            : { kind: 'people', message: 'Un nombre entier de personnes, de 1 à 100.' };
    });
});
