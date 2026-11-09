import { FakeRecipeAnalyzer } from '../domain/recipe-analyzer.fake';
import { InvalidAiOutputError } from '../domain/invalid-ai-output.error';
import { parseExtractedRecipeDraft } from './extracted-recipe-draft.parser';

describe('parseExtractedRecipeDraft', () => {
    const draft = new FakeRecipeAnalyzer().draft;

    it('returns a valid draft unchanged', () => {
        const json: unknown = JSON.parse(JSON.stringify({ ...draft, sourceUrl: 'https://x.y/1' }));

        expect(parseExtractedRecipeDraft(json)).toEqual({ ...draft, sourceUrl: 'https://x.y/1' });
    });

    it('fills fields missing from older drafts with null and `other`', () => {
        const { title, basePortions, instructions } = draft;

        expect(
            parseExtractedRecipeDraft({
                title,
                basePortions,
                instructions,
                ingredients: [{ name: 'Sel' }],
            }),
        ).toEqual({
            title,
            description: null,
            basePortions,
            instructions,
            ingredients: [{ name: 'Sel', quantity: null, unit: null }],
            category: 'other',
        });
    });

    it('turns an unknown category into `other`', () => {
        expect(parseExtractedRecipeDraft({ ...draft, category: 'cake' }).category).toBe('other');
    });

    it.each([
        ['not an object', 'Tarte'],
        ['a list', [draft]],
        ['no title', { ...draft, title: undefined }],
        ['no portions', { ...draft, basePortions: '4' }],
        ['instructions not all strings', { ...draft, instructions: ['Cuire', 3] }],
        ['ingredients not a list', { ...draft, ingredients: 'Farine' }],
        ['an ingredient without a name', { ...draft, ingredients: [{ quantity: 1 }] }],
        [
            'a quantity that is not a number',
            { ...draft, ingredients: [{ name: 'Sel', quantity: '1' }] },
        ],
        ['a description that is not a string', { ...draft, description: 42 }],
    ])('rejects %s', (_, json) => {
        expect(() => parseExtractedRecipeDraft(json)).toThrow(InvalidAiOutputError);
    });
});
