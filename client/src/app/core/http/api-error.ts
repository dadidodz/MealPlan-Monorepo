/**
 * A failure with a stable `code`, received outside an HTTP error response (e.g. in an SSE message).
 * `toUserMessage` turns the code into French text.
 */
export class ApiError extends Error {
    constructor(readonly code: string) {
        super(code);
        this.name = 'ApiError';
    }
}
