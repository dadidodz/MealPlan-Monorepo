import { Injectable } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PlannedMealReader, PlannedMealSummary } from '../domain/planned-meal-reader.port';

// Prisma represents a `@db.Date` column as a `Date` at midnight UTC, whatever the server's time zone
function toDate(day: Temporal.PlainDate): Date {
    return new Date(day.toZonedDateTime('UTC').epochMilliseconds);
}

function toPlainDate(date: Date): Temporal.PlainDate {
    return Temporal.Instant.fromEpochMilliseconds(date.getTime())
        .toZonedDateTimeISO('UTC')
        .toPlainDate();
}

@Injectable()
export class PrismaPlannedMealReader implements PlannedMealReader {
    constructor(private readonly prisma: PrismaService) {}

    async listBetween(
        from: Temporal.PlainDate,
        to: Temporal.PlainDate,
    ): Promise<PlannedMealSummary[]> {
        const rows = await this.prisma.plannedMeal.findMany({
            where: { date: { gte: toDate(from), lte: toDate(to) } },
            select: {
                id: true,
                date: true,
                mealType: true,
                peopleCount: true,
                recipe: { select: { id: true, title: true } },
            },
            // PostgreSQL sorts an enum in its declaration order: lunch before dinner
            orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
        });

        return rows.map((row) => ({ ...row, date: toPlainDate(row.date) }));
    }
}
