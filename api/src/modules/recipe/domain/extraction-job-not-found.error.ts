import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class ExtractionJobNotFoundError extends DomainError {
    readonly code = 'EXTRACTION_JOB_NOT_FOUND';
    readonly kind: DomainErrorKind = 'not-found';

    constructor(jobId: string) {
        super(`Extraction job ${jobId} not found or expired`);
    }
}
