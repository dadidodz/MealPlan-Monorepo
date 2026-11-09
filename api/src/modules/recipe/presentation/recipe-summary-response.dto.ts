import { RecipeCategory } from '../domain/recipe-category';

export class RecipeSummaryResponseDto {
    id!: string;
    title!: string;
    description!: string | null;
    category!: RecipeCategory;
    imageUrl!: string | null;
    createdAt!: string;
    updatedAt!: string;
}
