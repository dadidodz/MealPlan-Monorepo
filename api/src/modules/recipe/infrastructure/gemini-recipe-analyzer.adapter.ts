import { Injectable, Logger } from '@nestjs/common';
import { createPartFromUri, FileState, GoogleGenAI, Schema, Type } from '@google/genai';
import { DomainError } from '../../../shared/domain/domain-error';
import { InvalidAiOutputError } from '../domain/invalid-ai-output.error';
import { NotARecipeError } from '../domain/not-a-recipe.error';
import {
    ExtractedRecipeDraft,
    RecipeAnalysis,
    RecipeAnalyzerPort,
} from '../domain/recipe-analyzer.port';
import { DownloadedVideo } from '../domain/video-downloader.port';
import { RECIPE_CATEGORIES } from '../domain/recipe-category';
import { parseExtractedRecipeDraft } from './extracted-recipe-draft.parser';
import {
    EXTRACT_RECIPE_PROMPT_VERSION,
    getExtractRecipePromptV3,
} from './prompts/extract-recipe.v3.prompt';

/** An alias: the version that actually answered is read from each response. */
const GEMINI_MODEL = 'gemini-flash-lite-latest';

/** Gemini usually processes a recipe video in under a minute: past this, give up. */
export const PROCESSING_TIMEOUT_MS = 5 * 60_000;

const RECIPE_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        isRecipe: {
            type: Type.BOOLEAN,
            description:
                "Vrai si la vidéo montre la préparation d'une recette, Faux si c'est autre chose (vlog, humour, etc.).",
        },
        title: { type: Type.STRING },
        description: { type: Type.STRING, nullable: true },
        basePortions: { type: Type.INTEGER },
        instructions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Les étapes de préparation dans l'ordre chronologique.",
        },
        ingredients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {
                        type: Type.STRING,
                        description: "Nom de l'ingrédient au singulier (ex: Tomate)",
                    },
                    quantity: { type: Type.NUMBER, nullable: true },
                    unit: {
                        type: Type.STRING,
                        nullable: true,
                        enum: ['g', 'kg', 'ml', 'cl', 'L', 'càc', 'càs', 'pincée'],
                    },
                },
                required: ['name'],
            },
        },
        category: {
            type: Type.STRING,
            enum: [...RECIPE_CATEGORIES],
        },
    },
    required: ['isRecipe', 'title', 'basePortions', 'instructions', 'ingredients', 'category'],
};

/**
 * Reads Gemini's JSON answer (shaped by RECIPE_SCHEMA) without trusting it.
 * @throws NotARecipeError when Gemini says the video isn't a recipe
 * @throws InvalidAiOutputError when the answer isn't JSON or isn't a valid draft
 */
export function draftFromGeminiText(text: string | undefined): ExtractedRecipeDraft {
    let json: unknown;
    try {
        json = JSON.parse(text ?? '');
    } catch {
        throw new InvalidAiOutputError('not JSON');
    }
    if (
        typeof json === 'object' &&
        json !== null &&
        'isRecipe' in json &&
        json.isRecipe === false
    ) {
        throw new NotARecipeError();
    }
    return parseExtractedRecipeDraft(json);
}

@Injectable()
export class GeminiRecipeAnalyzer implements RecipeAnalyzerPort {
    private readonly logger = new Logger(GeminiRecipeAnalyzer.name);
    private readonly ai: GoogleGenAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing environment variable GEMINI_API_KEY.');
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    async analyze(video: DownloadedVideo): Promise<RecipeAnalysis> {
        let uploadedName: string | undefined;

        try {
            this.logger.log('Uploading the video to Gemini...');
            let file = await this.ai.files.upload({
                file: new Blob([new Uint8Array(video.buffer)], { type: video.mimeType }),
                config: { mimeType: video.mimeType, displayName: 'TikTok/Reel Recipe' },
            });
            uploadedName = file.name;
            if (uploadedName === undefined) throw new Error('Gemini returned no file name.');

            this.logger.log('Upload done. Waiting for Gemini to process the video...');
            const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
            while (file.state === FileState.PROCESSING) {
                if (Date.now() >= deadline) {
                    throw new Error('Gemini took too long to process the video.');
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
                file = await this.ai.files.get({ name: uploadedName });
            }

            if (file.state === FileState.FAILED || file.uri === undefined) {
                throw new Error('Gemini failed to process the video.');
            }

            this.logger.log(`Video ready. Starting the analysis with ${GEMINI_MODEL}...`);

            const response = await this.ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: [
                    createPartFromUri(file.uri, file.mimeType ?? video.mimeType),
                    getExtractRecipePromptV3(video.description),
                ],
                config: { responseMimeType: 'application/json', responseSchema: RECIPE_SCHEMA },
            });

            const aiModel = response.modelVersion ?? GEMINI_MODEL;
            const usage = response.usageMetadata;
            const tokens = usage
                ? ` Tokens: input (video + text) ${usage.promptTokenCount} | output (JSON) ${usage.candidatesTokenCount} | total ${usage.totalTokenCount}`
                : '';
            this.logger.log(`Answered by ${aiModel}.${tokens}`);

            return {
                draft: draftFromGeminiText(response.text),
                aiModel,
                promptVersion: EXTRACT_RECIPE_PROMPT_VERSION,
            };
        } catch (error) {
            // Not a recipe is a normal outcome: a warning, not an error with a stack
            if (error instanceof NotARecipeError) {
                this.logger.warn(error.message);
                throw error;
            }
            this.logger.error('Gemini analysis failed', error);

            if (error instanceof DomainError) throw error;

            throw new Error('Could not extract a recipe from this video.', { cause: error });
        } finally {
            if (uploadedName !== undefined) {
                await this.ai.files
                    .delete({ name: uploadedName })
                    .catch((cleanupError: unknown) =>
                        this.logger.warn('Failed to delete the uploaded video', cleanupError),
                    );
            }
        }
    }
}
