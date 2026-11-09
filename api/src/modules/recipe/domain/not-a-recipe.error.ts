import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class NotARecipeError extends DomainError {
    readonly code = 'NOT_A_RECIPE';
    readonly kind: DomainErrorKind = 'invalid';

    constructor() {
        super('The video does not show a recipe');
    }
}
