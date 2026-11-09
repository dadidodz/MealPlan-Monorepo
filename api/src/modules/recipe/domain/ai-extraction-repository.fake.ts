import { Temporal } from '@js-temporal/polyfill';
import { ExtractionStatus, RecipeAiExtraction } from './recipe-ai-extraction.entity';
import { AiExtractionRepository, FinishedAnalysis } from './ai-extraction-repository.port';
import { ExtractedRecipeDraft } from './recipe-analyzer.port';

export class InMemoryAiExtractionRepository implements AiExtractionRepository {
    readonly extractions = new Map<string, RecipeAiExtraction>();
    /** Every status written, in order, per URL. */
    readonly statusHistory = new Map<string, ExtractionStatus[]>();

    findByUrl(url: string): Promise<RecipeAiExtraction | null> {
        return Promise.resolve(this.extractions.get(url) ?? null);
    }

    /** Like the Prisma adapter: replaces status, data, model and prompt version, keeps the id. */
    upsert(url: string, status: ExtractionStatus, data?: ExtractedRecipeDraft): Promise<void> {
        const existing = this.extractions.get(url);
        this.write(url, status, data ?? null, null, null, null, existing);
        return Promise.resolve();
    }

    /** Like the Prisma adapter: fails on an unknown URL, keeps data, model and version when no analysis is given. */
    updateStatus(
        url: string,
        status: ExtractionStatus,
        analysis?: FinishedAnalysis,
    ): Promise<void> {
        const existing = this.extractions.get(url);
        if (!existing) return Promise.reject(new Error(`No extraction for ${url}`));
        this.write(
            url,
            status,
            analysis?.draft ?? existing.extractedData,
            analysis?.aiModel ?? existing.aiModel,
            analysis?.promptVersion ?? existing.promptVersion,
            analysis?.extractedAt ?? null,
            existing,
        );
        return Promise.resolve();
    }

    private write(
        url: string,
        status: ExtractionStatus,
        data: ExtractedRecipeDraft | null,
        aiModel: string | null,
        promptVersion: string | null,
        extractedAt: Temporal.Instant | null,
        existing: RecipeAiExtraction | undefined,
    ): void {
        this.extractions.set(
            url,
            new RecipeAiExtraction(
                existing?.id ?? crypto.randomUUID(),
                url,
                status,
                data,
                aiModel,
                promptVersion,
                extractedAt ??
                    existing?.extractedAt ??
                    Temporal.Instant.from('2026-01-01T10:00:00Z'),
            ),
        );
        this.statusHistory.set(url, [...(this.statusHistory.get(url) ?? []), status]);
    }
}
