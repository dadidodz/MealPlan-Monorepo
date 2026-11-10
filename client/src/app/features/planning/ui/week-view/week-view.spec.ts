import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { hostElement } from '../../../../../testing/host-element';
import type { PlannedMealSummary } from '@mealplan/shared';
import { WeekView } from './week-view';

const dinner: PlannedMealSummary = {
    id: 'meal-1',
    date: '2026-11-02',
    mealType: 'DINNER',
    peopleCount: 4,
    recipe: { id: 'recipe-1', title: 'Burger maison' },
};

describe('WeekView', () => {
    let fixture: ComponentFixture<WeekView>;

    beforeEach(async () => {
        fixture = TestBed.createComponent(WeekView);
        fixture.componentRef.setInput('monday', new Date(2026, 10, 2));
        fixture.componentRef.setInput('meals', [dinner]);
        await fixture.whenStable();
    });

    it('shows the seven days in order', () => {
        const titles = Array.from(hostElement(fixture).querySelectorAll('h2'), (title) =>
            title.textContent?.trim(),
        );

        expect(titles).toHaveLength(7);
        expect(titles[0]).toBe('lundi 2 nov.');
        expect(titles[6]).toBe('dimanche 8 nov.');
    });

    it('shows a planned meal by its recipe title only', () => {
        const monday = hostElement(fixture).querySelector('li');
        const slots = monday?.querySelectorAll('dl > div') ?? [];

        expect(slots[1]?.textContent).toContain('Soir');
        expect(slots[1]?.textContent).toContain('Burger maison');
        expect(slots[1]?.textContent).not.toContain('4');
        expect(slots[1]?.querySelector('button')).toBeNull();
    });

    it('offers to plan a meal on every empty slot, disabled for now', () => {
        const buttons = Array.from(hostElement(fixture).querySelectorAll('button'));

        expect(buttons).toHaveLength(13);
        for (const button of buttons) {
            expect(button.textContent).toContain('Planifier');
            expect(button.disabled).toBe(true);
        }
    });

    it('has no accessibility violations', async () => {
        expect(await axeViolations(hostElement(fixture))).toEqual([]);
    });
});
