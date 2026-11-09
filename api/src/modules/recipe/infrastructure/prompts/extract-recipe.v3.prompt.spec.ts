import { getExtractRecipePromptV3 } from './extract-recipe.v3.prompt';

describe('getExtractRecipePromptV3', () => {
    const fallback = 'Aucune description textuelle fournie.';

    it('includes the video description', () => {
        expect(getExtractRecipePromptV3('Tarte aux pommes #recette')).toContain(
            'Tarte aux pommes #recette',
        );
    });

    it.each([undefined, null, ''])('uses the fallback text for a %j description', (description) => {
        expect(getExtractRecipePromptV3(description)).toContain(fallback);
    });
});
