import { Temporal } from '@js-temporal/polyfill';
import { InvalidPlannedMealError } from './invalid-planned-meal.error';

export type MealType = 'LUNCH' | 'DINNER';

const MIN_PEOPLE = 1;
const MAX_PEOPLE = 100;

export interface PlannedMealProps {
    id: string;
    date: Temporal.PlainDate;
    mealType: MealType;
    recipeId: string;
    /** How many people eat this meal, always stored: editing a recipe's portions never changes it. */
    peopleCount: number;
}

/** What the caller provides to plan a meal: no id. */
export type NewPlannedMeal = Omit<PlannedMealProps, 'id'>;

export class PlannedMeal {
    private constructor(private readonly props: PlannedMealProps) {}

    /**
     * New planned meal: checks the number of people, generates the id.
     * @throws InvalidPlannedMealError if it isn't a whole number from 1 to 100.
     */
    static create(input: NewPlannedMeal): PlannedMeal {
        const { peopleCount } = input;
        if (
            !Number.isInteger(peopleCount) ||
            peopleCount < MIN_PEOPLE ||
            peopleCount > MAX_PEOPLE
        ) {
            throw new InvalidPlannedMealError(
                `peopleCount must be a whole number from ${MIN_PEOPLE} to ${MAX_PEOPLE}, got ${peopleCount}`,
            );
        }
        return new PlannedMeal({ ...input, id: crypto.randomUUID() });
    }

    /** Rebuild from storage: data was valid when saved, no checks. Only mappers (and test data) call this. */
    static restore(props: PlannedMealProps): PlannedMeal {
        return new PlannedMeal({ ...props });
    }

    get id(): string {
        return this.props.id;
    }
    get date(): Temporal.PlainDate {
        return this.props.date;
    }
    get mealType(): MealType {
        return this.props.mealType;
    }
    get recipeId(): string {
        return this.props.recipeId;
    }
    get peopleCount(): number {
        return this.props.peopleCount;
    }
}
