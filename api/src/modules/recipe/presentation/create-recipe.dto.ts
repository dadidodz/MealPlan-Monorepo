import {
    IsString,
    IsOptional,
    IsInt,
    Min,
    IsArray,
    ValidateNested,
    IsNumber,
    IsBoolean,
    ArrayNotEmpty,
    IsIn,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RECIPE_CATEGORIES, type RecipeCategory } from '../domain/recipe-category';

class CreateIngredientDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsNumber()
    quantity!: number | null;

    @IsOptional()
    @IsString()
    unit!: string | null;

    @IsOptional()
    @IsBoolean()
    isIgnoredInShoppingList?: boolean;
}

export class CreateRecipeDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description!: string | null;

    @IsInt()
    @Min(1)
    basePortions!: number;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    instructions!: string[];

    @IsOptional()
    @IsString()
    sourceUrl!: string | null;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateIngredientDto)
    ingredients!: CreateIngredientDto[];

    @IsIn(RECIPE_CATEGORIES)
    category!: RecipeCategory;

    @IsOptional()
    @IsString()
    imageUrl!: string | null;
}
