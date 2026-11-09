import { AiExtractionRepository } from '../domain/ai-extraction-repository.port';
import { ExtractionNotFoundError } from '../domain/extraction-not-found.error';
import { ExtractedRecipeDraft } from '../domain/recipe-analyzer.port';
import { UrlNormalizer } from '../domain/url-normalizer.port';

export class GetCachedExtractionUseCase {
    constructor(
        private readonly extractionRepo: AiExtractionRepository,
        private readonly urlNormalizer: UrlNormalizer,
    ) {}

    async execute(rawUrl: string): Promise<ExtractedRecipeDraft> {
        const canonicalUrl = await this.urlNormalizer.normalize(rawUrl);

        const extraction = await this.extractionRepo.findByUrl(canonicalUrl);

        if (extraction?.status !== 'SUCCESS' || !extraction.extractedData) {
            throw new ExtractionNotFoundError(canonicalUrl);
        }

        return { ...extraction.extractedData, sourceUrl: canonicalUrl };
    }
}
