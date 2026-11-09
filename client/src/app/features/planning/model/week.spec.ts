import type { PlannedMealSummary } from '@mealplan/shared';
import {
    addDays,
    isoWeekOf,
    mondayOf,
    mondayOfIsoWeek,
    toDayString,
    toPlannerDays,
    weekRangeLabel,
} from './week';

const dinner: PlannedMealSummary = {
    id: 'meal-1',
    date: '2026-11-02',
    mealType: 'DINNER',
    peopleCount: 4,
    recipe: { id: 'recipe-1', title: 'Burger maison' },
};

describe('mondayOf', () => {
    it.each([
        ['a Monday', new Date(2026, 10, 2), '2026-11-02'],
        ['a Friday', new Date(2026, 9, 30), '2026-10-26'],
        ['a Sunday', new Date(2026, 10, 8), '2026-11-02'],
        ['a day late in the evening', new Date(2026, 10, 8, 23, 59), '2026-11-02'],
        ['a day of the week the clocks change', new Date(2026, 9, 25), '2026-10-19'],
        ['a week spanning two years', new Date(2027, 0, 1), '2026-12-28'],
    ])('finds the Monday from %s', (_, day, monday) => {
        expect(toDayString(mondayOf(day))).toBe(monday);
    });
});

describe('addDays', () => {
    it('moves across a clock change by whole days', () => {
        expect(toDayString(addDays(new Date(2026, 9, 24), 2))).toBe('2026-10-26');
        expect(toDayString(addDays(new Date(2026, 2, 28), 2))).toBe('2026-03-30');
    });
});

describe('isoWeekOf', () => {
    it.each([
        [new Date(2026, 10, 2), '2026-W45'],
        [new Date(2026, 10, 8), '2026-W45'],
        // The Thursday decides the year: these days belong to the neighbouring year's week
        [new Date(2025, 11, 29), '2026-W01'],
        [new Date(2027, 0, 1), '2026-W53'],
        [new Date(2027, 0, 3), '2026-W53'],
        [new Date(2027, 0, 4), '2027-W01'],
    ])('gives the week of %s', (day, week) => {
        expect(isoWeekOf(day)).toBe(week);
    });
});

describe('mondayOfIsoWeek', () => {
    it.each([
        ['2026-W45', '2026-11-02'],
        ['2026-W01', '2025-12-29'],
        ['2026-W53', '2026-12-28'],
        ['2027-W01', '2027-01-04'],
    ])('finds the Monday of %s', (week, monday) => {
        const found = mondayOfIsoWeek(week);

        expect(found && toDayString(found)).toBe(monday);
    });

    it.each([
        undefined,
        '',
        'abc',
        '2026-W54',
        '2026-W00',
        '2025-W53',
        '2026-W5',
        '2026-11-02',
        '0000-W01',
    ])('refuses %s', (week) => {
        expect(mondayOfIsoWeek(week)).toBeUndefined();
    });
});

describe('toDayString', () => {
    it('keeps the local day late in the evening and at midnight', () => {
        expect(toDayString(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02');
        expect(toDayString(new Date(2026, 10, 2))).toBe('2026-11-02');
    });
});

describe('weekRangeLabel', () => {
    it('names both days and the month', () => {
        const label = weekRangeLabel(new Date(2026, 10, 2));

        expect(label).toContain('2');
        expect(label).toContain('8');
        expect(label).toContain('nov.');
    });
});

describe('toPlannerDays', () => {
    const monday = new Date(2026, 10, 2);

    it('gives Monday to Sunday with a French label', () => {
        const days = toPlannerDays(monday, []);

        expect(days.map((day) => day.date)).toEqual([
            '2026-11-02',
            '2026-11-03',
            '2026-11-04',
            '2026-11-05',
            '2026-11-06',
            '2026-11-07',
            '2026-11-08',
        ]);
        expect(days[0]?.label).toBe('lundi 2 nov.');
    });

    it('gives each day a lunch then a dinner slot', () => {
        const days = toPlannerDays(monday, []);

        for (const day of days) {
            expect(day.slots.map((slot) => slot.mealType)).toEqual(['LUNCH', 'DINNER']);
        }
    });

    it('puts a meal on its own slot only', () => {
        const days = toPlannerDays(monday, [dinner]);
        const filled = days.flatMap((day) => day.slots).filter((slot) => slot.meal);

        expect(filled).toEqual([{ mealType: 'DINNER', label: 'Soir', meal: dinner }]);
        expect(days[0]?.slots[1]?.meal).toEqual(dinner);
    });

    it('ignores a meal outside the week', () => {
        const days = toPlannerDays(monday, [{ ...dinner, date: '2026-11-09' }]);

        expect(days.flatMap((day) => day.slots).filter((slot) => slot.meal)).toEqual([]);
    });
});
