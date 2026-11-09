import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { hostElement } from '../../../../../testing/host-element';
import { Icon, IconName } from '../../../../shared/ui/icon/icon';
import { CATEGORY_ICONS, RecipeCategory } from '../../model/recipe-category';
import { RecipeLightResponse } from '../../model/recipe.type';
import { RecipeCard } from './recipe-card';

const recipe: RecipeLightResponse = {
    id: '42',
    title: 'Barres au quinoa soufflé',
    description: null,
    basePortions: 4,
    category: 'fish',
    imageUrl: null,
    createdAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
};

/** SVG markup of the recipe icon (the card's first icon) for a recipe of this category. */
async function recipeIconSvg(category: RecipeCategory): Promise<string | undefined> {
    const fixture = TestBed.createComponent(RecipeCard);
    fixture.componentRef.setInput('recipe', { ...recipe, category });
    await fixture.whenStable();
    return hostElement(fixture).querySelector('app-icon svg')?.outerHTML;
}

/** SVG markup the shared icon component renders for an icon name. */
async function iconSvg(name: IconName): Promise<string | undefined> {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);
    await fixture.whenStable();
    return hostElement(fixture).querySelector('svg')?.outerHTML;
}

describe('RecipeCard', () => {
    it.each<RecipeCategory>(['fish', 'dessert', 'other'])(
        'shows the icon of the %s category',
        async (category) => {
            const svg = await recipeIconSvg(category);
            expect(svg).toBeDefined();
            expect(svg).toBe(await iconSvg(CATEGORY_ICONS[category]));
        },
    );

    it('shows the icon of other for a category it does not know', async () => {
        const fixture = TestBed.createComponent(RecipeCard);
        // Raw API data: setInput is untyped, like a response from a newer API
        fixture.componentRef.setInput('recipe', { ...recipe, category: 'brunch' });
        await fixture.whenStable();

        const svg = hostElement(fixture).querySelector('app-icon svg')?.outerHTML;
        expect(svg).toBeDefined();
        expect(svg).toBe(await iconSvg(CATEGORY_ICONS.other));
    });

    describe('actions', () => {
        async function renderCard(): Promise<ComponentFixture<RecipeCard>> {
            const fixture = TestBed.createComponent(RecipeCard);
            fixture.componentRef.setInput('recipe', recipe);
            await fixture.whenStable();
            return fixture;
        }

        it('has no accessibility violations', async () => {
            expect(await axeViolations(hostElement(await renderCard()))).toEqual([]);
        });

        function button(fixture: ComponentFixture<RecipeCard>, label: string): HTMLButtonElement {
            const found = Array.from(hostElement(fixture).querySelectorAll('button')).find(
                (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
            );
            if (!found) throw new Error(`Button "${label}" not found`);
            return found;
        }

        it('emits the recipe id when the title button is pressed', async () => {
            const fixture = await renderCard();
            const opened = vi.fn();
            fixture.componentInstance.cardClicked.subscribe(opened);

            button(fixture, recipe.title).click();

            expect(opened).toHaveBeenCalledWith('42');
        });

        it('closes the menu from its backdrop', async () => {
            const fixture = await renderCard();
            button(fixture, 'Actions de la recette').click();
            await fixture.whenStable();
            expect(hostElement(fixture).textContent).toContain('Supprimer');

            button(fixture, 'Fermer le menu').click();
            await fixture.whenStable();
            expect(hostElement(fixture).textContent).not.toContain('Supprimer');
        });
    });
});
