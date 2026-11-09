import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Temporal } from '@js-temporal/polyfill';
import { AiExtractionRepository, FinishedAnalysis } from '../domain/ai-extraction-repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
    ExtractionStatus,
    RecipeAiExtraction,
    extractionStatusOf,
} from '../domain/recipe-ai-extraction.entity';
import { ExtractedRecipeDraft } from '../domain/recipe-analyzer.port';
import { parseExtractedRecipeDraft } from './extracted-recipe-draft.parser';

/** Plain JSON for Prisma: a domain interface has no index signature, an object literal does. */
function toJson(draft: ExtractedRecipeDraft): Prisma.InputJsonObject {
    return {
        title: draft.title,
        description: draft.description,
        basePortions: draft.basePortions,
        instructions: draft.instructions,
        ingredients: draft.ingredients.map(({ name, quantity, unit }) => ({
            name,
            quantity,
            unit,
        })),
        category: draft.category,
        ...(draft.sourceUrl !== undefined && { sourceUrl: draft.sourceUrl }),
    };
}

@Injectable()
export class PrismaAiExtractionRepository implements AiExtractionRepository {
    private readonly logger = new Logger(PrismaAiExtractionRepository.name);

    constructor(private readonly prisma: PrismaService) {}

    async findByUrl(url: string): Promise<RecipeAiExtraction | null> {
        const prismaExtraction = await this.prisma.recipeAiExtraction.findUnique({
            where: { sourceUrl: url },
        });

        if (!prismaExtraction) return null;

        return new RecipeAiExtraction(
            prismaExtraction.id,
            prismaExtraction.sourceUrl,
            extractionStatusOf(prismaExtraction.status),
            this.draftOf(url, prismaExtraction.extractedData),
            prismaExtraction.aiModel,
            prismaExtraction.promptVersion,
            Temporal.Instant.fromEpochMilliseconds(prismaExtraction.extractedAt.getTime()),
        );
    }

    async upsert(
        url: string,
        status: ExtractionStatus,
        data?: ExtractedRecipeDraft,
    ): Promise<void> {
        const fields = {
            status,
            extractedData: data ? toJson(data) : Prisma.DbNull,
            aiModel: null,
            promptVersion: null,
        };
        await this.prisma.recipeAiExtraction.upsert({
            where: { sourceUrl: url },
            update: fields,
            create: { sourceUrl: url, ...fields },
        });
    }

    async updateStatus(
        url: string,
        status: ExtractionStatus,
        analysis?: FinishedAnalysis,
    ): Promise<void> {
        await this.prisma.recipeAiExtraction.update({
            where: { sourceUrl: url },
            data: {
                status,
                ...(analysis && {
                    extractedData: toJson(analysis.draft),
                    aiModel: analysis.aiModel,
                    promptVersion: analysis.promptVersion,
                    extractedAt: new Date(analysis.extractedAt.epochMilliseconds),
                }),
            },
        });
    }

    /** An unreadable stored draft counts as missing: the URL is extracted again instead of failing. */
    private draftOf(url: string, json: Prisma.JsonValue): ExtractedRecipeDraft | null {
        if (json === null) return null;
        try {
            return parseExtractedRecipeDraft(json);
        } catch (error) {
            this.logger.warn(`Ignoring the unreadable draft stored for ${url}: ${String(error)}`);
            return null;
        }
    }
}
