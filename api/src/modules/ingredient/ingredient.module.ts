import { Module } from '@nestjs/common';
import { SearchIngredientsUseCase } from './application/search-ingredients.use-case';
import { INGREDIENT_READER, IngredientReader } from './domain/ingredient-reader.port';
import { PrismaIngredientReader } from './infrastructure/prisma-ingredient.reader';
import { IngredientController } from './presentation/ingredient.controller';

@Module({
    controllers: [IngredientController],
    providers: [
        { provide: INGREDIENT_READER, useClass: PrismaIngredientReader },
        {
            provide: SearchIngredientsUseCase,
            useFactory: (reader: IngredientReader): SearchIngredientsUseCase =>
                new SearchIngredientsUseCase(reader),
            inject: [INGREDIENT_READER],
        },
    ],
})
export class IngredientModule {}
