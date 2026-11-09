import { ingredientCodeOf } from './ingredient-code';

describe('ingredientCodeOf', () => {
    it.each([
        [' PÂte brisée ', 'pate-brisee'],
        ['Crème fraîche', 'creme-fraiche'],
        ['huile_d_olive', 'huile-d-olive'],
        ['sel  fin', 'sel-fin'],
        ['Herbes (de Provence) !', 'herbes-de-provence'],
        ['a - b', 'a-b'],
        ['Œuf', 'oeuf'],
        ['Bœuf', 'boeuf'],
        ['Cæsar', 'caesar'],
        ['', ''],
    ])('turns %j into %j', (name, code) => {
        expect(ingredientCodeOf(name)).toBe(code);
    });
});
