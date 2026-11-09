import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

/** The video of a link couldn't be fetched (private or deleted video, timeout, file too big): the cause is only logged. */
export class VideoDownloadFailedError extends DomainError {
    readonly code = 'VIDEO_DOWNLOAD_FAILED';
    readonly kind: DomainErrorKind = 'invalid';

    constructor() {
        super('Could not download the video from this link.');
    }
}
