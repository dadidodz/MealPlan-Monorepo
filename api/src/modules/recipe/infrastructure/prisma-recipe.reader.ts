import { Injectable } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { recipeCategoryOf } from '../domain/recipe-category';
import { RecipeReader, RecipeSummary } from '../domain/recipe-reader.port';

@Injectable()
export class PrismaRecipeReader implements RecipeReader {
    constructor(private readonly prisma: PrismaService) {}

    async list(page: { limit: number; offset: number }): Promise<RecipeSummary[]> {
        const rows = await this.prisma.recipe.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: page.limit,
            skip: page.offset,
        });

        return rows.map((row) => ({
            ...row,
            category: recipeCategoryOf(row.category),
            createdAt: Temporal.Instant.fromEpochMilliseconds(row.createdAt.getTime()),
            updatedAt: Temporal.Instant.fromEpochMilliseconds(row.updatedAt.getTime()),
        }));
    }
}
