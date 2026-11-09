import { Temporal } from '@js-temporal/polyfill';
import { resetDatabase } from '../../../../test/support/reset-database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FinishedAnalysis } from '../domain/ai-extraction-repository.port';
import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import { PrismaAiExtractionRepository } from './prisma-ai-extraction.repository';

describe('PrismaAiExtractionRepository', () => {
    const prisma = new PrismaService();
    const repository = new PrismaAiExtractionRepository(prisma);
    const url = 'https://www.tiktok.com/@chef/video/123';
    const draft = { ...new FakeRecipeAnalyzer().draft, sourceUrl: url };
    // Millisecond precision: what PostgreSQL timestamps keep
    const extractedAt = Temporal.Instant.from('2026-10-08T18:02:27.123Z');
    const analysis: FinishedAnalysis = {
        draft,
        aiModel: 'gemini-test',
        promptVersion: 'v3',
        extractedAt,
    };

    beforeEach(() => resetDatabase(prisma));
    afterAll(() => prisma.$disconnect());

    it('stores an extraction without data, then reloads the analysis written on success', async () => {
        await repository.upsert(url, 'IN_PROGRESS');
        expect(await repository.findByUrl(url)).toMatchObject({
            status: 'IN_PROGRESS',
            extractedData: null,
        });

        await repository.updateStatus(url, 'SUCCESS', analysis);

        const reloaded = await repository.findByUrl(url);
        expect(reloaded?.extractedAt.equals(extractedAt)).toBe(true);
        expect(reloaded).toMatchObject({
            sourceUrl: url,
            status: 'SUCCESS',
            extractedData: draft,
            aiModel: 'gemini-test',
            promptVersion: 'v3',
        });
    });

    it('keeps the analysis when only the status changes, and clears it on upsert', async () => {
        await repository.upsert(url, 'IN_PROGRESS');
        await repository.updateStatus(url, 'SUCCESS', analysis);
        await repository.updateStatus(url, 'ERROR');
        expect(await repository.findByUrl(url)).toMatchObject({
            status: 'ERROR',
            extractedData: draft,
            aiModel: 'gemini-test',
            promptVersion: 'v3',
        });

        await repository.upsert(url, 'IN_PROGRESS');

        expect(await repository.findByUrl(url)).toMatchObject({
            extractedData: null,
            aiModel: null,
            promptVersion: null,
        });
    });

    it('reads an unreadable stored draft as missing data', async () => {
        await prisma.recipeAiExtraction.create({
            data: { sourceUrl: url, status: 'SUCCESS', extractedData: { title: 42 } },
        });

        expect(await repository.findByUrl(url)).toMatchObject({
            status: 'SUCCESS',
            extractedData: null,
        });
    });

    it('returns null for an unknown URL', async () => {
        expect(await repository.findByUrl(url)).toBeNull();
    });
});
