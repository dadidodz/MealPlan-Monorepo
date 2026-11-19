import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class PlannedMealNotFoundError extends DomainError {
    readonly code = 'PLANNED_MEAL_NOT_FOUND';
    readonly kind: DomainErrorKind = 'not-found';

    constructor(id: string) {
        super(`Planned meal ${id} not found`);
    }
}
