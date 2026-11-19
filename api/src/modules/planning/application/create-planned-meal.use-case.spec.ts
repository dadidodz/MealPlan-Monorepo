import { Temporal } from '@js-temporal/polyfill';
import { RecipeNotFoundError } from '../../recipe/domain/recipe-not-found.error';
import { InvalidPlannedMealError } from '../domain/invalid-planned-meal.error';
import { NewPlannedMeal } from '../domain/planned-meal.entity';
import { PlannedMealDetails, PlannedMealReader } from '../domain/planned-meal-reader.port';
import { InMemoryPlannedMealRepository } from '../domain/planned-meal-repository.fake';
import { PlannedMealNotFoundError } from '../domain/planned-meal-not-found.error';
import { SlotAlreadyTakenError } from '../domain/slot-already-taken.error';
import { CreatePlannedMealUseCase } from './create-planned-meal.use-case';

const dinner: NewPlannedMeal = {
    date: Temporal.PlainDate.from('2026-11-02'),
    mealType: 'DINNER',
    recipeId: 'burger',
    peopleCount: 4,
};

describe('CreatePlannedMealUseCase', () => {
    let repository: InMemoryPlannedMealRepository;
    let useCase: CreatePlannedMealUseCase;

    /** Reads back the meal really stored, on a burger recipe written for 2. */
    function storedMealsReader(): PlannedMealReader {
        return {
            listBetween: () => Promise.resolve([]),
            getDetails: (id): Promise<PlannedMealDetails> => {
                const meal = repository.meals.find((stored) => stored.id === id);
                if (!meal) return Promise.reject(new PlannedMealNotFoundError(id));
                return Promise.resolve({
                    id: meal.id,
                    date: meal.date,
                    mealType: meal.mealType,
                    peopleCount: meal.peopleCount,
                    recipe: {
                        id: meal.recipeId,
                        title: 'Burger maison',
                        category: 'meat',
                        imageUrl: null,
                        basePortions: 2,
                        instructions: ['Monter les burgers.'],
                        ingredients: [
                            { ingredientId: 'bun', name: 'pain', quantity: 2, unit: 'pièce' },
                            { ingredientId: 'salt', name: 'sel', quantity: null, unit: null },
                        ],
                    },
                });
            },
        };
    }

    beforeEach(() => {
        repository = new InMemoryPlannedMealRepository(['burger']);
        useCase = new CreatePlannedMealUseCase(repository, storedMealsReader());
    });

    it('stores the meal', async () => {
        await useCase.execute(dinner);

        expect(repository.meals).toHaveLength(1);
        expect(repository.meals[0]?.peopleCount).toBe(4);
    });

    it('returns the meal with its quantities for the number of people', async () => {
        const meal = await useCase.execute(dinner);

        expect(meal.id).toBe(repository.meals[0]?.id);
        expect(meal.peopleCount).toBe(4);
        expect(meal.recipe.ingredients.map(({ quantity }) => quantity)).toEqual([4, null]);
        expect(meal.recipe).not.toHaveProperty('basePortions');
    });

    it('accepts a past day like any other', async () => {
        const meal = await useCase.execute({
            ...dinner,
            date: Temporal.PlainDate.from('2020-01-06'),
        });

        expect(meal.date.toString()).toBe('2020-01-06');
    });

    it('refuses a taken slot and keeps the existing meal', async () => {
        await useCase.execute(dinner);

        await expect(useCase.execute({ ...dinner, peopleCount: 8 })).rejects.toThrow(
            SlotAlreadyTakenError,
        );

        expect(repository.meals).toHaveLength(1);
        expect(repository.meals[0]?.peopleCount).toBe(4);
    });

    it('refuses an unknown recipe', async () => {
        await expect(useCase.execute({ ...dinner, recipeId: 'unknown' })).rejects.toThrow(
            RecipeNotFoundError,
        );
    });

    it('refuses an invalid number of people before storing anything', async () => {
        await expect(useCase.execute({ ...dinner, peopleCount: 101 })).rejects.toThrow(
            InvalidPlannedMealError,
        );

        expect(repository.meals).toEqual([]);
    });
});
