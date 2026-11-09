import { RecipeCategory } from './recipe-category';

export interface RecipeCreatedResponse {
    id: string;
}

export interface RecipeLightResponse {
    id: string;
    title: string;
    description: string | null;
    basePortions: number;
    category: RecipeCategory;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RecipeIngredientResponse {
    ingredientId: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    isIgnoredInShoppingList: boolean;
}

export interface RecipeResponse {
    id: string;
    title: string;
    description: string | null;
    basePortions: number;
    instructions: string[];
    sourceUrl: string | null;
    ingredients: RecipeIngredientResponse[];
    category: RecipeCategory;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Body of a recipe save (`PATCH /recipes/:id`); creation adds the source link. */
export interface RecipePayload {
    title: string;
    description: string | null;
    basePortions: number;
    category: RecipeCategory;
    ingredients: { name: string; quantity: number | null; unit: string | null }[];
    instructions: string[];
}
