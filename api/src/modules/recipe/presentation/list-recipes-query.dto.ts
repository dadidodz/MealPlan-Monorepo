import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListRecipesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(1000)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 25;

    /** In the contract, ignored until `BACKLOG.md` "Recipe search" is built. */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
}
