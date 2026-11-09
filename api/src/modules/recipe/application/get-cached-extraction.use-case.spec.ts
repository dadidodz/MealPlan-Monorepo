import { InMemoryAiExtractionRepository } from '../domain/ai-extraction-repository.fake';
import { ExtractionNotFoundError } from '../domain/extraction-not-found.error';
import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import { ExtractionStatus } from '../domain/recipe-ai-extraction.entity';
import { GetCachedExtractionUseCase } from './get-cached-extraction.use-case';
import { FakeUrlNormalizer } from '../domain/url-normalizer.fake';

describe('GetCachedExtractionUseCase', () => {
    const url = 'https://www.tiktok.com/@chef/video/123';
    const draft = new FakeRecipeAnalyzer().draft;
    let extractions: InMemoryAiExtractionRepository;
    let urlNormalizer: FakeUrlNormalizer;
    let useCase: GetCachedExtractionUseCase;

    beforeEach(() => {
        extractions = new InMemoryAiExtractionRepository();
        urlNormalizer = new FakeUrlNormalizer();
        useCase = new GetCachedExtractionUseCase(extractions, urlNormalizer);
    });

    it('returns the extracted draft with its source URL', async () => {
        await extractions.upsert(url, 'SUCCESS', { ...draft });

        expect(await useCase.execute(url)).toEqual({ ...draft, sourceUrl: url });
    });

    it('looks up the full URL a short link leads to', async () => {
        urlNormalizer.redirects.set('https://vm.tiktok.com/ZMabc/', url);
        await extractions.upsert(url, 'SUCCESS', { ...draft });

        expect(await useCase.execute('https://vm.tiktok.com/ZMabc/')).toEqual({
            ...draft,
            sourceUrl: url,
        });
    });

    it('drops the query string before looking up the URL', async () => {
        await extractions.upsert(url, 'SUCCESS', { ...draft });

        expect(await useCase.execute(`${url}?is_from_webapp=1`)).toEqual({
            ...draft,
            sourceUrl: url,
        });
    });

    it('fails with an ExtractionNotFoundError for an unknown URL', async () => {
        await expect(useCase.execute(url)).rejects.toThrow(ExtractionNotFoundError);
    });

    it.each<ExtractionStatus>(['IN_PROGRESS', 'ERROR', 'MANUAL'])(
        'fails with an ExtractionNotFoundError for a %s extraction',
        async (status) => {
            await extractions.upsert(url, status, { ...draft });

            await expect(useCase.execute(url)).rejects.toThrow(ExtractionNotFoundError);
        },
    );

    it('fails with an ExtractionNotFoundError for a successful extraction without data', async () => {
        await extractions.upsert(url, 'SUCCESS');

        await expect(useCase.execute(url)).rejects.toThrow(ExtractionNotFoundError);
    });
});
