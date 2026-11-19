import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class InvalidPlannedMealError extends DomainError {
    readonly code = 'INVALID_PLANNED_MEAL';
    readonly kind: DomainErrorKind = 'invalid';
}
