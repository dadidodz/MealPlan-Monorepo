import { RecipeCategory } from '../domain/recipe-category';

export class RecipeIngredientResponseDto {
    ingredientId!: string;
    name!: string;
    quantity!: number | null;
    unit!: string | null;
    isIgnoredInShoppingList!: boolean;
}

export class RecipeResponseDto {
    id!: string;
    title!: string;
    description!: string | null;
    basePortions!: number;
    instructions!: string[];
    sourceUrl!: string | null;
    ingredients!: RecipeIngredientResponseDto[];
    category!: RecipeCategory;
    imageUrl!: string | null;
    createdAt!: string;
    updatedAt!: string;
}
