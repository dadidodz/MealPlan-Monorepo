import { NewPlannedMeal, PlannedMeal } from '../domain/planned-meal.entity';
import { PlannedMealReader } from '../domain/planned-meal-reader.port';
import { PlannedMealRepository } from '../domain/planned-meal-repository.port';
import { ScaledPlannedMeal, scalePlannedMeal } from '../domain/scale-quantity';

export class CreatePlannedMealUseCase {
    constructor(
        private readonly repository: PlannedMealRepository,
        private readonly reader: PlannedMealReader,
    ) {}

    /**
     * Plans a recipe on a slot and returns the meal with its quantities for the number of people.
     * @throws InvalidPlannedMealError if the number of people isn't a whole number from 1 to 100.
     * @throws SlotAlreadyTakenError if a meal is already planned on the slot; it isn't replaced.
     * @throws RecipeNotFoundError if the recipe doesn't exist.
     */
    async execute(command: NewPlannedMeal): Promise<ScaledPlannedMeal> {
        const meal = PlannedMeal.create(command);
        await this.repository.add(meal);
        return scalePlannedMeal(await this.reader.getDetails(meal.id));
    }
}
