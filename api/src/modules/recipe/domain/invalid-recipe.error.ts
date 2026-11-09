import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class InvalidRecipeError extends DomainError {
    readonly code = 'INVALID_RECIPE';
    readonly kind: DomainErrorKind = 'invalid';
}
