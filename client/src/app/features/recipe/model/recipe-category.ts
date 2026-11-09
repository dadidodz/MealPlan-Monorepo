import { IconName } from '../../../shared/ui/icon/icon';

/** Same list and order as the API (decision D1). */
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

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
    meat: 'Viande',
    poultry: 'Volaille',
    fish: 'Poisson',
    vegetarian: 'Végétarien',
    stew: 'Plat mijoté',
    salad: 'Salade',
    soup: 'Soupe',
    pizza: 'Pizza, tarte salée',
    sandwich: 'Sandwich, burger',
    breakfast: 'Petit-déj',
    dessert: 'Dessert',
    drink: 'Boisson',
    other: 'Autre',
};

/** The only place that knows which icon shows a category. */
export const CATEGORY_ICONS: Record<RecipeCategory, IconName> = {
    meat: 'lucideBeef',
    poultry: 'lucideDrumstick',
    fish: 'lucideFish',
    vegetarian: 'lucideCarrot',
    stew: 'lucideCookingPot',
    salad: 'lucideSalad',
    soup: 'lucideSoup',
    pizza: 'lucidePizza',
    sandwich: 'lucideSandwich',
    breakfast: 'lucideCroissant',
    dessert: 'lucideCakeSlice',
    drink: 'lucideCoffee',
    other: 'lucideUtensils',
};

/** Reads a value from the API: missing or unknown (e.g. a draft cached before categories existed) → `other`. */
export function recipeCategoryOf(value: unknown): RecipeCategory {
    return RECIPE_CATEGORIES.find((category) => category === value) ?? 'other';
}
