import { HttpErrorResponse } from '@angular/common/http';
import {
    afterNextRender,
    Component,
    computed,
    inject,
    Injector,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorCode, toUserMessage } from '../../core/http/to-user-message';
import { PlannedMealApi } from '../../features/planning/data-access/planned-meal-api';
import {
    emptyPlanMealForm,
    PlanMealFormModel,
    planMealFormSchema,
} from '../../features/planning/model/plan-meal-form';
import {
    addDays,
    isoWeekOf,
    mondayOf,
    mondayOfIsoWeek,
    PlannerSlot,
    toDayString,
    weekRangeLabel,
} from '../../features/planning/model/week';
import { PlanMealModal } from '../../features/planning/ui/plan-meal-modal/plan-meal-modal';
import { WeekView } from '../../features/planning/ui/week-view/week-view';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import { Icon } from '../../shared/ui/icon/icon';
import { ToastStore } from '../../shared/ui/toast-store';

@Component({
    selector: 'app-planner',
    imports: [RouterLink, Icon, ErrorState, WeekView, PlanMealModal],
    templateUrl: './planner.html',
})
export class Planner {
    private readonly plannedMealApi = inject(PlannedMealApi);
    private readonly toast = inject(ToastStore);
    private readonly injector = inject(Injector);

    private readonly weekView = viewChild(WeekView);

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

    /** The slot whose modal is open, if any. */
    protected readonly slotToPlan = signal<PlannerSlot | undefined>(undefined);
    protected readonly planError = signal<string | undefined>(undefined);
    private readonly planModel = signal<PlanMealFormModel>(emptyPlanMealForm());
    protected readonly planForm = form(this.planModel, planMealFormSchema, {
        submission: {
            action: async (field) => {
                await this.planMeal(field().value());
                return undefined;
            },
        },
    });

    protected openPlanModal(slot: PlannerSlot): void {
        this.planForm().reset(emptyPlanMealForm());
        this.planError.set(undefined);
        this.slotToPlan.set(slot);
    }

    private async planMeal({ recipe, peopleCount }: PlanMealFormModel): Promise<void> {
        const slot = this.slotToPlan();
        if (!slot || !recipe || peopleCount === null) return;
        this.planError.set(undefined);

        try {
            await firstValueFrom(
                this.plannedMealApi.create({
                    date: slot.date,
                    mealType: slot.mealType,
                    recipeId: recipe.id,
                    peopleCount,
                }),
            );
            this.toast.success('Repas planifié.');
        } catch (error: unknown) {
            const slotTaken =
                error instanceof HttpErrorResponse &&
                errorCode(error.error) === 'SLOT_ALREADY_TAKEN';
            // The user may have closed the modal while it was saving: the error must still show somewhere
            if (!slotTaken && this.slotToPlan() === slot) {
                this.planError.set(toUserMessage(error));
                return;
            }
            this.toast.error(toUserMessage(error));
            if (!slotTaken) return;
        }
        this.showPlannedSlot(slot);
    }

    /** The button that opened the modal is gone or about to be: the focus goes to the day, once the modal has left. */
    private showPlannedSlot(slot: PlannerSlot): void {
        this.meals.reload();
        // Closed meanwhile, the modal may even be open on another slot: nothing to close, the focus stays where it is
        if (this.slotToPlan() !== slot) return;
        this.slotToPlan.set(undefined);
        afterNextRender(() => this.weekView()?.focusDay(slot.date), { injector: this.injector });
    }
}
