import { IngredientReader, IngredientSummary } from './ingredient-reader.port';

export class InMemoryIngredientReader implements IngredientReader {
    readonly queries: string[] = [];

    constructor(private readonly ingredients: IngredientSummary[] = []) {}

    searchByCode(codeFragment: string): Promise<IngredientSummary[]> {
        this.queries.push(codeFragment);
        return Promise.resolve(this.ingredients.filter((i) => i.code.includes(codeFragment)));
    }
}
