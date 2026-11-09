export type DomainErrorKind = 'not-found' | 'invalid' | 'conflict';

/** Base of every business error. Presentation maps `kind` to an HTTP status; `code` goes to the UI. */
export abstract class DomainError extends Error {
    abstract readonly code: string;
    abstract readonly kind: DomainErrorKind;
}
