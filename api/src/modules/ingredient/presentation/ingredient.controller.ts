import { Controller, Get, Query } from '@nestjs/common';
import { SearchIngredientsUseCase } from '../application/search-ingredients.use-case';
import { IngredientPresenter } from './ingredient.presenter';
import { IngredientSummaryResponseDto } from './ingredient-summary-response.dto';

@Controller('ingredients')
export class IngredientController {
    constructor(private readonly searchIngredientsUseCase: SearchIngredientsUseCase) {}

    @Get('search')
    async search(@Query('q') query: string): Promise<IngredientSummaryResponseDto[]> {
        const ingredients = await this.searchIngredientsUseCase.execute(query || '');

        return ingredients.map((ingredient) => IngredientPresenter.toSummaryResponse(ingredient));
    }
}
