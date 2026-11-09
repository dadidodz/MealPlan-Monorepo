import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class InvalidAiOutputError extends DomainError {
    readonly code = 'INVALID_AI_OUTPUT';
    readonly kind: DomainErrorKind = 'invalid';

    constructor(reason: string) {
        super(`Invalid recipe draft: ${reason}`);
    }
}
