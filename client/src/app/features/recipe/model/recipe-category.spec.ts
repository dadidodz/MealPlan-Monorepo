import { isIconName } from '../../../shared/ui/icon/icon';
import {
    CATEGORY_ICONS,
    CATEGORY_LABELS,
    RECIPE_CATEGORIES,
    recipeCategoryOf,
} from './recipe-category';

describe('recipe categories', () => {
    it.each(RECIPE_CATEGORIES)('%s has a label and a known icon', (category) => {
        expect(CATEGORY_LABELS[category]).not.toBe('');
        expect(isIconName(CATEGORY_ICONS[category])).toBe(true);
    });

    it.each(RECIPE_CATEGORIES)('recipeCategoryOf keeps %s', (category) => {
        expect(recipeCategoryOf(category)).toBe(category);
    });

    it.each([undefined, null, '', 'lucideUtensils', 'Meat'])(
        'recipeCategoryOf turns %j into other',
        (value) => {
            expect(recipeCategoryOf(value)).toBe('other');
        },
    );
});
