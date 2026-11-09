import { IngredientSummary } from '../domain/ingredient-reader.port';
import { IngredientSummaryResponseDto } from './ingredient-summary-response.dto';

export class IngredientPresenter {
    static toSummaryResponse(ingredient: IngredientSummary): IngredientSummaryResponseDto {
        return {
            id: ingredient.id,
            name: ingredient.name,
            code: ingredient.code,
            category: ingredient.category,
        };
    }
}
