/** Dish type when it is distinctive (soup, salad, pizza…), else the main ingredient (decision D1). */
export const RECIPE_CATEGORIES = [
    'meat',
    'poultry',
    'fish',
    'vegetarian',
    'stew',
    'salad',
    'soup',
    'pizza',
    'sandwich',
    'breakfast',
    'dessert',
    'drink',
    'other',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

/** Reads a stored or AI-provided value: anything outside the list becomes `other`. */
export function recipeCategoryOf(value: string): RecipeCategory {
    return RECIPE_CATEGORIES.find((category) => category === value) ?? 'other';
}
