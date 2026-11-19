import { Temporal } from '@js-temporal/polyfill';
import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
import { MealType } from './planned-meal.entity';

export class SlotAlreadyTakenError extends DomainError {
    readonly code = 'SLOT_ALREADY_TAKEN';
    readonly kind: DomainErrorKind = 'conflict';

    constructor(date: Temporal.PlainDate, mealType: MealType) {
        super(`A meal is already planned for ${date.toString()} ${mealType}`);
    }
}
