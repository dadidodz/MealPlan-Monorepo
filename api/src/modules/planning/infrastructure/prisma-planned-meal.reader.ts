import { Injectable } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { recipeCategoryOf } from '../../recipe/domain/recipe-category';
import { PlannedMealNotFoundError } from '../domain/planned-meal-not-found.error';
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

    async getDetails(id: string): Promise<PlannedMealDetails> {
        const row = await this.prisma.plannedMeal.findUnique({
            where: { id },
            select: {
                id: true,
                date: true,
                mealType: true,
                peopleCount: true,
                recipe: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        imageUrl: true,
                        basePortions: true,
                        instructions: true,
                        ingredients: {
                            select: {
                                ingredientId: true,
                                quantity: true,
                                unit: true,
                                ingredient: { select: { name: true } },
                            },
                            orderBy: { position: 'asc' },
                        },
                    },
                },
            },
        });
        if (!row) throw new PlannedMealNotFoundError(id);

        return {
            ...row,
            date: toPlainDate(row.date),
            recipe: {
                ...row.recipe,
                category: recipeCategoryOf(row.recipe.category),
                ingredients: row.recipe.ingredients.map(
                    ({ ingredientId, quantity, unit, ingredient }) => ({
                        ingredientId,
                        name: ingredient.name,
                        quantity,
                        unit,
                    }),
                ),
            },
        };
    }
}
