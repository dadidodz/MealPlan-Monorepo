import { RECIPE_CATEGORIES, recipeCategoryOf } from './recipe-category';

describe('recipeCategoryOf', () => {
    it.each(RECIPE_CATEGORIES)('keeps %j', (category) => {
        expect(recipeCategoryOf(category)).toBe(category);
    });

    it.each(['', 'lucideUtensils', 'Meat'])('turns %j into other', (value) => {
        expect(recipeCategoryOf(value)).toBe('other');
    });
});
