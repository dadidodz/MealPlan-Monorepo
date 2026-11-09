import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlannedMealApi } from '../../features/planning/data-access/planned-meal-api';
import {
    addDays,
    isoWeekOf,
    mondayOf,
    mondayOfIsoWeek,
    toDayString,
    weekRangeLabel,
} from '../../features/planning/model/week';
import { WeekView } from '../../features/planning/ui/week-view/week-view';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { Icon } from '../../shared/ui/icon/icon';

@Component({
    selector: 'app-planner',
    imports: [RouterLink, Icon, ErrorState, WeekView],
    templateUrl: './planner.html',
})
export class Planner {
    private readonly plannedMealApi = inject(PlannedMealApi);

    /** Query parameter `?week=2026-W45`, bound by `withComponentInputBinding()`. Absent or invalid: the current week. */
    readonly week = input<string>();

    protected readonly monday = computed(
        () => mondayOfIsoWeek(this.week()) ?? mondayOf(new Date()),
    );
    protected readonly rangeLabel = computed(() => weekRangeLabel(this.monday()));
    protected readonly previousWeek = computed(() => isoWeekOf(addDays(this.monday(), -7)));
    protected readonly nextWeek = computed(() => isoWeekOf(addDays(this.monday(), 7)));

    protected readonly meals = this.plannedMealApi.listBetween(
        () => toDayString(this.monday()),
        () => toDayString(addDays(this.monday(), 6)),
    );
}
