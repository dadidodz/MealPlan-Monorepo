export const INGREDIENT_READER = Symbol('IngredientReader');

/** Ingredient as shown in search suggestions. */
export interface IngredientSummary {
    id: string;
    name: string;
    code: string;
    category: string | null;
}

export interface IngredientReader {
    /** Ingredients whose code contains `codeFragment`, by name, at most 10. */
    searchByCode(codeFragment: string): Promise<IngredientSummary[]>;
}
