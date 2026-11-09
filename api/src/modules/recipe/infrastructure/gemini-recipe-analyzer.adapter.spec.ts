import { Logger } from '@nestjs/common';
import { FileState } from '@google/genai';
import { InvalidAiOutputError } from '../domain/invalid-ai-output.error';
import { NotARecipeError } from '../domain/not-a-recipe.error';
import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import {
    draftFromGeminiText,
    GeminiRecipeAnalyzer,
    PROCESSING_TIMEOUT_MS,
} from './gemini-recipe-analyzer.adapter';

const gemini = vi.hoisted(() => ({
    upload: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    generateContent: vi.fn(),
}));

vi.mock('@google/genai', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@google/genai')>()),
    GoogleGenAI: class {
        files = { upload: gemini.upload, get: gemini.get, delete: gemini.delete };
        models = { generateContent: gemini.generateContent };
    },
}));

describe('draftFromGeminiText', () => {
    const draft = new FakeRecipeAnalyzer().draft;

    it('returns the draft of a recipe answer, without the isRecipe flag', () => {
        expect(draftFromGeminiText(JSON.stringify({ isRecipe: true, ...draft }))).toEqual(draft);
    });

    it('fails with NotARecipeError when Gemini says the video is not a recipe', () => {
        expect(() => draftFromGeminiText(JSON.stringify({ isRecipe: false }))).toThrow(
            NotARecipeError,
        );
    });

    it.each([
        ['no text', undefined],
        ['empty text', ''],
        ['text that is not JSON', 'Voici la recette :'],
        ['a draft without title', JSON.stringify({ isRecipe: true, ...draft, title: undefined })],
        ['a draft with text portions', JSON.stringify({ ...draft, basePortions: 'quatre' })],
    ])('fails with InvalidAiOutputError for %s', (_, text) => {
        expect(() => draftFromGeminiText(text)).toThrow(InvalidAiOutputError);
    });
});

describe('GeminiRecipeAnalyzer', () => {
    const video = { buffer: Buffer.from('video'), mimeType: 'video/mp4' };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubEnv('GEMINI_API_KEY', 'test-key');
        const stuck = { name: 'files/1', state: FileState.PROCESSING };
        gemini.upload.mockResolvedValue(stuck);
        gemini.get.mockResolvedValue(stuck);
        gemini.delete.mockResolvedValue({});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('gives up on a video still processing after the timeout, and deletes it', async () => {
        const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

        const result = new GeminiRecipeAnalyzer().analyze(video);
        const rejected = expect(result).rejects.toThrow(
            'Could not extract a recipe from this video.',
        );
        await vi.advanceTimersByTimeAsync(PROCESSING_TIMEOUT_MS + 2000);
        await rejected;

        expect(logError).toHaveBeenCalledWith(
            'Gemini analysis failed',
            new Error('Gemini took too long to process the video.'),
        );
        expect(gemini.generateContent).not.toHaveBeenCalled();
        expect(gemini.delete).toHaveBeenCalledWith({ name: 'files/1' });
    });
});
