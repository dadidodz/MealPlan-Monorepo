import { InMemoryIngredientReader } from '../domain/ingredient-reader.fake';
import { IngredientSummary } from '../domain/ingredient-reader.port';
import { SearchIngredientsUseCase } from './search-ingredients.use-case';

describe('SearchIngredientsUseCase', () => {
    const ingredient = (name: string, code: string): IngredientSummary => ({
        id: code,
        name,
        code,
        category: null,
    });
    let reader: InMemoryIngredientReader;
    let useCase: SearchIngredientsUseCase;

    beforeEach(() => {
        reader = new InMemoryIngredientReader([
            ingredient('Farine', 'farine'),
            ingredient('Farine complète', 'farine-complete'),
            ingredient('Pâte brisée', 'pate-brisee'),
        ]);
        useCase = new SearchIngredientsUseCase(reader);
    });

    it('returns the matching ingredients', async () => {
        expect((await useCase.execute('far')).map((i) => i.name)).toEqual([
            'Farine',
            'Farine complète',
        ]);
    });

    it('searches by code, ignoring case and accents', async () => {
        expect((await useCase.execute(' PÂTE b')).map((i) => i.name)).toEqual(['Pâte brisée']);
        expect(reader.queries).toEqual(['pate-b']);
    });

    it.each(['', 'f', ' f ', '!!'])('returns nothing without searching for %j', async (query) => {
        expect(await useCase.execute(query)).toEqual([]);
        expect(reader.queries).toEqual([]);
    });
});
