import {
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    ValidateNested,
    Min,
    IsBoolean,
    IsInt,
    IsIn,
    IsNotEmpty,
    ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RECIPE_CATEGORIES, type RecipeCategory } from '../domain/recipe-category';

/** Like `@IsOptional()` but only for a missing field: an explicit `null` is still validated (and rejected). */
const IsOptionalNotNull = (): PropertyDecorator =>
    ValidateIf((_object: object, value: unknown) => value !== undefined);

class UpdateIngredientDto {
    @IsString()
    name!: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    quantity!: number | null;

    @IsString()
    @IsOptional()
    unit!: string | null;

    @IsBoolean()
    @IsOptional()
    isIgnoredInShoppingList?: boolean;
}

export class UpdateRecipeDto {
    @IsString()
    @IsNotEmpty()
    @IsOptionalNotNull()
    title?: string;

    /** `null` clears it. */
    @IsString()
    @IsOptional()
    description?: string | null;

    @IsInt()
    @Min(1)
    @IsOptionalNotNull()
    basePortions?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateIngredientDto)
    @IsOptionalNotNull()
    ingredients?: UpdateIngredientDto[];

    @IsArray()
    @IsString({ each: true })
    @IsOptionalNotNull()
    instructions?: string[];

    @IsIn(RECIPE_CATEGORIES)
    @IsOptionalNotNull()
    category?: RecipeCategory;

    @IsString()
    @IsOptional()
    imageUrl!: string | null;
}
