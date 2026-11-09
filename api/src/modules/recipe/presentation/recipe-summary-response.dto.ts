import { RecipeCategory } from '../domain/recipe-category';

export class RecipeSummaryResponseDto {
    id!: string;
    title!: string;
    description!: string | null;
    basePortions!: number;
    category!: RecipeCategory;
    imageUrl!: string | null;
    createdAt!: string;
    updatedAt!: string;
}
