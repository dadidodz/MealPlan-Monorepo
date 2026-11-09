import { ExtractedRecipeDraft, RecipeAnalysis, RecipeAnalyzerPort } from './recipe-analyzer.port';
import { DownloadedVideo } from './video-downloader.port';

export class FakeRecipeAnalyzer implements RecipeAnalyzerPort {
    readonly analyzedVideos: DownloadedVideo[] = [];
    failure: Error | null = null;
    draft: ExtractedRecipeDraft = {
        title: 'Tarte',
        description: null,
        basePortions: 4,
        instructions: ['Cuire 30 min'],
        ingredients: [{ name: 'Farine', quantity: 200, unit: 'g' }],
        category: 'dessert',
    };

    readonly aiModel = 'fake-model';
    readonly promptVersion = 'v-test';

    analyze(video: DownloadedVideo): Promise<RecipeAnalysis> {
        this.analyzedVideos.push(video);
        if (this.failure) return Promise.reject(this.failure);
        return Promise.resolve({
            draft: { ...this.draft },
            aiModel: this.aiModel,
            promptVersion: this.promptVersion,
        });
    }
}
