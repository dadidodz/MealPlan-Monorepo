import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class ExtractionNotFoundError extends DomainError {
    readonly code = 'EXTRACTION_NOT_FOUND';
    readonly kind: DomainErrorKind = 'not-found';

    constructor(url: string) {
        super(`No successful extraction for ${url}`);
    }
}
