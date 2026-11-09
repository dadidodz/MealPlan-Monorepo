import { Temporal } from '@js-temporal/polyfill';
import { ExtractedRecipeDraft } from './recipe-analyzer.port';

export const EXTRACTION_STATUSES = ['IN_PROGRESS', 'SUCCESS', 'ERROR', 'MANUAL'] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

/** Reads a stored status. */
export function extractionStatusOf(value: string): ExtractionStatus {
    const status = EXTRACTION_STATUSES.find((known) => known === value);
    if (!status) throw new Error(`Unknown extraction status ${value}`);
    return status;
}

export class RecipeAiExtraction {
    constructor(
        public readonly id: string,
        public readonly sourceUrl: string,
        public readonly status: ExtractionStatus,
        public readonly extractedData: ExtractedRecipeDraft | null,
        public readonly aiModel: string | null,
        public readonly promptVersion: string | null,
        /** When the stored draft was extracted (the row's creation time until a first success). */
        public readonly extractedAt: Temporal.Instant,
    ) {}
}
