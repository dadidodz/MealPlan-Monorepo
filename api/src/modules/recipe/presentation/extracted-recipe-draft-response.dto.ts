import { RecipeCategory } from '../domain/recipe-category';

export class ExtractedIngredientResponseDto {
    name!: string;
    quantity!: number | null;
    unit!: string | null;
}

export class ExtractedRecipeDraftResponseDto {
    title!: string;
    description!: string | null;
    basePortions!: number;
    instructions!: string[];
    ingredients!: ExtractedIngredientResponseDto[];
    category!: RecipeCategory;
    sourceUrl?: string;
}
