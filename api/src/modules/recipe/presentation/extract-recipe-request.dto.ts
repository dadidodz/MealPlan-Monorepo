import { IsNotEmpty, IsUrl } from 'class-validator';

export class ExtractRecipeRequestDto {
    @IsNotEmpty()
    @IsUrl()
    url!: string;
}
