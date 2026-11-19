/* eslint-disable @typescript-eslint/no-unused-vars -- red TDD commit: a skeleton whose bodies come with the green commit */
import { Injectable } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
    PlannedMealDetails,
    PlannedMealReader,
    PlannedMealSummary,
} from '../domain/planned-meal-reader.port';
import { toDate, toPlainDate } from './planned-meal.mapper';

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

    getDetails(id: string): Promise<PlannedMealDetails> {
        throw new Error('Not implemented');
    }
}
