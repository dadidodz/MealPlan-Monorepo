import { InvalidAiOutputError } from '../domain/invalid-ai-output.error';
import { ExtractedRecipeDraft } from '../domain/recipe-analyzer.port';
import { recipeCategoryOf } from '../domain/recipe-category';

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): never {
    throw new InvalidAiOutputError(reason);
}

/** `null` when missing, so drafts stored before a field existed still load. */
function optional<T>(value: unknown, isT: (v: unknown) => v is T, field: string): T | null {
    if (value === undefined || value === null) return null;
    return isT(value) ? value : fail(`${field} has the wrong type`);
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';

function ingredientOf(value: unknown, index: number): ExtractedRecipeDraft['ingredients'][number] {
    if (!isObject(value) || !isString(value.name)) fail(`ingredient ${index} has no name`);
    return {
        name: value.name,
        quantity: optional(value.quantity, isNumber, `ingredient ${index} quantity`),
        unit: optional(value.unit, isString, `ingredient ${index} unit`),
    };
}

/**
 * Narrows untrusted JSON (the AI output, a stored extraction) into a draft, without casts.
 * Title, portions, instructions and ingredient names are required; the rest falls back to null / `other`.
 * @throws InvalidAiOutputError when a required field is missing or a field has the wrong type
 */
export function parseExtractedRecipeDraft(value: unknown): ExtractedRecipeDraft {
    if (!isObject(value)) fail('not an object');
    const { title, basePortions, instructions, ingredients, category, sourceUrl } = value;
    if (!isString(title)) fail('title is missing');
    if (!isNumber(basePortions)) fail('basePortions is missing');
    if (!Array.isArray(instructions) || !instructions.every(isString)) {
        fail('instructions must be a list of strings');
    }
    if (!Array.isArray(ingredients)) fail('ingredients must be a list');

    return {
        title,
        description: optional(value.description, isString, 'description'),
        basePortions,
        instructions,
        ingredients: ingredients.map((ingredient, index) => ingredientOf(ingredient, index)),
        category: recipeCategoryOf(optional(category, isString, 'category') ?? 'other'),
        ...(isString(sourceUrl) && { sourceUrl }),
    };
}
