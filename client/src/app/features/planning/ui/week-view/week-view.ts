/* eslint-disable @typescript-eslint/no-unused-vars -- red TDD commit: a skeleton whose bodies come with the green commit */
import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { PlannedMealSummary } from '@mealplan/shared';
import { PlannerSlot, toPlannerDays } from '../../model/week';

/** A week as a vertical list of days, with a lunch and a dinner slot per day. */
@Component({
    selector: 'app-week-view',
    imports: [Icon],
    templateUrl: './week-view.html',
    host: { class: 'block' },
})
export class WeekView {
    readonly monday = input.required<Date>();
    readonly meals = input.required<readonly PlannedMealSummary[]>();

    /** The user wants to plan a meal on this empty slot. */
    readonly planRequested = output<PlannerSlot>();

    protected readonly days = computed(() => toPlannerDays(this.monday(), this.meals()));

    /** Moves the focus to a day (`YYYY-MM-DD`) of the week shown, for when what had it is gone. */
    public focusDay(date: string): void {
        throw new Error('Not implemented');
    }
}
