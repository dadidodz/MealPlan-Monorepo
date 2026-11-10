import { Temporal } from '@js-temporal/polyfill';
import { InvalidDateRangeError } from '../domain/invalid-date-range.error';
import { PlannedMealReader, PlannedMealSummary } from '../domain/planned-meal-reader.port';

export class ListPlannedMealsUseCase {
    constructor(private readonly reader: PlannedMealReader) {}

    /** @throws InvalidDateRangeError when `from` is after `to`. */
    async execute(from: Temporal.PlainDate, to: Temporal.PlainDate): Promise<PlannedMealSummary[]> {
        if (Temporal.PlainDate.compare(from, to) > 0) {
            throw new InvalidDateRangeError(from, to);
        }
        return this.reader.listBetween(from, to);
    }
}
