import { Component, computed, input } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { PlannedMealSummary } from '@mealplan/shared';
import { toPlannerDays } from '../../model/week';

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

    protected readonly days = computed(() => toPlannerDays(this.monday(), this.meals()));
}
