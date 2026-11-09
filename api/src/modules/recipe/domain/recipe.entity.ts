import { Temporal } from '@js-temporal/polyfill';
import { InvalidRecipeError } from './invalid-recipe.error';
import { RecipeCategory } from './recipe-category';

export class RecipeIngredient {
    constructor(
        public readonly ingredientId: string,
        public readonly name: string,
        public readonly quantity: number | null,
        public readonly unit: string | null,
        public readonly isIgnoredInShoppingList = false,
        public readonly code: string,
    ) {}
}

export interface RecipeExtractionInfo {
    id: string;
    sourceUrl: string;
    aiModel?: string | null;
}

export interface RecipeProps {
    id: string;
    title: string;
    description: string | null;
    /** Number of servings the quantities are written for. */
    basePortions: number;
    instructions: string[];
    aiExtraction: RecipeExtractionInfo | null;
    ingredients: RecipeIngredient[];
    category: RecipeCategory;
    imageUrl: string | null;
    createdAt: Temporal.Instant;
    updatedAt: Temporal.Instant;
}

/** What the caller provides to create a recipe: no id, no dates. */
export type NewRecipe = Omit<RecipeProps, 'id' | 'createdAt' | 'updatedAt'>;

export class Recipe {
    private constructor(private readonly props: RecipeProps) {}

    /** New recipe: checks every rule, generates the id. */
    static create(input: NewRecipe, now: Temporal.Instant): Recipe {
        const recipe = new Recipe({
            ...input,
            instructions: [...input.instructions],
            ingredients: [...input.ingredients],
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        });
        recipe.rename(input.title, now);
        recipe.changePortions(input.basePortions, now);
        return recipe;
    }

    /** Rebuild from storage: data was valid when saved, no checks. Only mappers (and test data) call this. */
    static restore(props: RecipeProps): Recipe {
        return new Recipe({ ...props });
    }

    get id(): string {
        return this.props.id;
    }
    get title(): string {
        return this.props.title;
    }
    get description(): string | null {
        return this.props.description;
    }
    get basePortions(): number {
        return this.props.basePortions;
    }
    get instructions(): readonly string[] {
        return this.props.instructions;
    }
    get aiExtraction(): RecipeExtractionInfo | null {
        return this.props.aiExtraction;
    }
    get ingredients(): readonly RecipeIngredient[] {
        return this.props.ingredients;
    }
    get category(): RecipeCategory {
        return this.props.category;
    }
    get imageUrl(): string | null {
        return this.props.imageUrl;
    }
    get createdAt(): Temporal.Instant {
        return this.props.createdAt;
    }
    get updatedAt(): Temporal.Instant {
        return this.props.updatedAt;
    }

    rename(title: string, now: Temporal.Instant): void {
        const trimmed = title.trim();
        if (trimmed === '') throw new InvalidRecipeError('Title must not be empty');
        this.props.title = trimmed;
        this.touch(now);
    }

    changeDescription(description: string | null, now: Temporal.Instant): void {
        this.props.description = description;
        this.touch(now);
    }

    changePortions(portions: number, now: Temporal.Instant): void {
        if (!Number.isInteger(portions) || portions < 1) {
            throw new InvalidRecipeError('Base portions must be a positive integer');
        }
        this.props.basePortions = portions;
        this.touch(now);
    }

    changeInstructions(instructions: string[], now: Temporal.Instant): void {
        this.props.instructions = [...instructions];
        this.touch(now);
    }

    changeCategory(category: RecipeCategory, now: Temporal.Instant): void {
        this.props.category = category;
        this.touch(now);
    }

    changeImage(imageUrl: string | null, now: Temporal.Instant): void {
        this.props.imageUrl = imageUrl;
        this.touch(now);
    }

    linkExtraction(extraction: RecipeExtractionInfo, now: Temporal.Instant): void {
        this.props.aiExtraction = { ...extraction };
        this.touch(now);
    }

    replaceIngredients(ingredients: RecipeIngredient[], now: Temporal.Instant): void {
        this.props.ingredients = [...ingredients];
        this.touch(now);
    }

    private touch(now: Temporal.Instant): void {
        this.props.updatedAt = now;
    }
}
