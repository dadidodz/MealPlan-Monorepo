import { applyEach, min, minLength, schema, validate } from '@angular/forms/signals';
import { RecipeFormModel } from './recipe-form.type';

/** Same rules as the API (a recipe it would refuse can't be submitted), French messages. */
export const recipeFormSchema = schema<RecipeFormModel>((recipe) => {
    validate(recipe.title, ({ value }) =>
        value().trim() === '' ? { kind: 'blank', message: 'Le titre est obligatoire.' } : undefined,
    );
    validate(recipe.basePortions, ({ value }) =>
        Number.isInteger(value()) && value() >= 1
            ? undefined
            : { kind: 'portions', message: 'Un nombre entier de portions, au moins 1.' },
    );
    applyEach(recipe.ingredients, (ingredient) => {
        validate(ingredient.name, ({ value }) =>
            value().trim() === ''
                ? { kind: 'blank', message: "Le nom de l'ingrédient est obligatoire." }
                : undefined,
        );
        min(ingredient.quantity, 0, { message: 'La quantité ne peut pas être négative.' });
    });
    minLength(recipe.instructions, 1, { message: 'Ajoutez au moins une étape.' });
    applyEach(recipe.instructions, (step) => {
        validate(step, ({ value }) =>
            value().trim() === '' ? { kind: 'blank', message: "L'étape est vide." } : undefined,
        );
    });
});
