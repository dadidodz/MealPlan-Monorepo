import { ingredientCodeOf } from '../domain/ingredient-code';
import { IngredientReader, IngredientSummary } from '../domain/ingredient-reader.port';

export class SearchIngredientsUseCase {
    constructor(private readonly reader: IngredientReader) {}

    /** Searches by code, so "pate" finds "Pâte brisée". Under 2 characters: no search. */
    async execute(query: string): Promise<IngredientSummary[]> {
        if (query.trim().length < 2) return [];

        const codeFragment = ingredientCodeOf(query);
        if (codeFragment === '') return [];

        return this.reader.searchByCode(codeFragment);
    }
}
