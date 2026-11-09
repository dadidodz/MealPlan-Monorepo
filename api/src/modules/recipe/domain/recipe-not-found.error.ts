import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class RecipeNotFoundError extends DomainError {
    readonly code = 'RECIPE_NOT_FOUND';
    readonly kind: DomainErrorKind = 'not-found';

    constructor(id: string) {
        super(`Recipe ${id} not found`);
    }
}
