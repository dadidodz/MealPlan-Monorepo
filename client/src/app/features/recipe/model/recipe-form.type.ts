import { RecipeCategory } from './recipe-category';

/** Shape of the recipe form. Empty text is `''` (form fields), an unknown quantity is `null`. */
export interface RecipeFormModel {
    title: string;
    description: string;
    basePortions: number;
    category: RecipeCategory;
    ingredients: RecipeFormIngredient[];
    instructions: string[];
}

export interface RecipeFormIngredient {
    name: string;
    quantity: number | null;
    unit: string;
}
