import { Temporal } from '@js-temporal/polyfill';
import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class InvalidDateRangeError extends DomainError {
    readonly code = 'INVALID_DATE_RANGE';
    readonly kind: DomainErrorKind = 'invalid';

    constructor(from: Temporal.PlainDate, to: Temporal.PlainDate) {
        super(`from (${from.toString()}) must not be after to (${to.toString()})`);
    }
}
