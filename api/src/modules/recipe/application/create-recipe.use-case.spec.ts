import { Temporal } from '@js-temporal/polyfill';
import { FixedClock } from '../../../shared/domain/clock.fake';
import { InvalidRecipeError } from '../domain/invalid-recipe.error';
import { InMemoryAiExtractionRepository } from '../domain/ai-extraction-repository.fake';
import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import { InMemoryRecipeRepository } from '../domain/recipe-repository.fake';
import { CreateRecipeCommand, CreateRecipeUseCase } from './create-recipe.use-case';

describe('CreateRecipeUseCase', () => {
    const sourceUrl = 'https://www.tiktok.com/@chef/video/123';
    let recipes: InMemoryRecipeRepository;
    let extractions: InMemoryAiExtractionRepository;
    let clock: FixedClock;
    let useCase: CreateRecipeUseCase;

    const command = (changes: Partial<CreateRecipeCommand> = {}): CreateRecipeCommand => ({
        title: 'Tarte',
        description: null,
        basePortions: 4,
        instructions: ['Cuire 30 min'],
        sourceUrl: null,
        ingredients: [{ name: ' Pâte brisée ', quantity: 1, unit: null }],
        category: 'dessert',
        imageUrl: null,
        ...changes,
    });

    beforeEach(() => {
        recipes = new InMemoryRecipeRepository();
        extractions = new InMemoryAiExtractionRepository();
        clock = new FixedClock(Temporal.Instant.from('2026-10-08T09:00:00Z'));
        useCase = new CreateRecipeUseCase(recipes, extractions, clock);
    });

    it('saves and returns the new recipe', async () => {
        const recipe = await useCase.execute(command());

        expect(recipes.recipes.get(recipe.id)).toBe(recipe);
        expect(recipe).toMatchObject({
            title: 'Tarte',
            description: null,
            basePortions: 4,
            instructions: ['Cuire 30 min'],
            category: 'dessert',
            imageUrl: null,
        });
    });

    it('trims ingredient names and derives their code', async () => {
        const recipe = await useCase.execute(command());

        expect(recipe.ingredients).toEqual([
            expect.objectContaining({
                name: 'Pâte brisée',
                code: 'pate-brisee',
                quantity: 1,
                unit: null,
                isIgnoredInShoppingList: false,
            }),
        ]);
    });

    it('keeps isIgnoredInShoppingList when given', async () => {
        const recipe = await useCase.execute(
            command({
                ingredients: [
                    { name: 'Sel', quantity: null, unit: null, isIgnoredInShoppingList: true },
                ],
            }),
        );

        expect(recipe.ingredients[0].isIgnoredInShoppingList).toBe(true);
    });

    it('sets createdAt and updatedAt to the current time', async () => {
        const recipe = await useCase.execute(command());

        expect(recipe.createdAt.equals(clock.now())).toBe(true);
        expect(recipe.updatedAt.equals(clock.now())).toBe(true);
    });

    it('links no extraction without a source URL', async () => {
        const recipe = await useCase.execute(command());

        expect(recipe.aiExtraction).toBeNull();
        expect(extractions.extractions.size).toBe(0);
    });

    it('creates a MANUAL extraction for a new source URL', async () => {
        const recipe = await useCase.execute(command({ sourceUrl }));

        const extraction = extractions.extractions.get(sourceUrl);
        expect(extraction?.status).toBe('MANUAL');
        expect(recipe.aiExtraction).toEqual({ id: extraction?.id, sourceUrl, aiModel: null });
    });

    it('creates no extraction when the recipe is rejected', async () => {
        await expect(useCase.execute(command({ title: '  ', sourceUrl }))).rejects.toThrow(
            InvalidRecipeError,
        );

        expect(extractions.extractions.size).toBe(0);
        expect(recipes.recipes.size).toBe(0);
    });

    it('links the existing extraction of the source URL without changing it', async () => {
        await extractions.upsert(sourceUrl, 'IN_PROGRESS');
        await extractions.updateStatus(sourceUrl, 'SUCCESS', {
            draft: new FakeRecipeAnalyzer().draft,
            aiModel: 'gemini-2.5-flash',
            promptVersion: 'v3',
            extractedAt: Temporal.Instant.from('2026-01-01T10:00:00Z'),
        });
        const existing = extractions.extractions.get(sourceUrl);

        const recipe = await useCase.execute(command({ sourceUrl }));

        expect(recipe.aiExtraction).toEqual({
            id: existing?.id,
            sourceUrl,
            aiModel: 'gemini-2.5-flash',
        });
        expect(extractions.extractions.get(sourceUrl)).toBe(existing);
    });
});
