import { RecipeReader, RecipeSummary } from '../domain/recipe-reader.port';

export class GetAllRecipesUseCase {
    constructor(private readonly reader: RecipeReader) {}

    execute(page: number, limit: number): Promise<RecipeSummary[]> {
        return this.reader.list({ limit, offset: (page - 1) * limit });
    }
}
