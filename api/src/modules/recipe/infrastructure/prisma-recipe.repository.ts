import { Injectable } from '@nestjs/common';
import { RecipeRepository } from '../domain/recipe-repository.port';
import { Recipe } from '../domain/recipe.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RecipeMapper } from './recipe.mapper';

@Injectable()
export class PrismaRecipeRepository implements RecipeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(recipe: Recipe): Promise<void> {
        const data = RecipeMapper.toPersistence(recipe);

        await this.prisma.recipe.upsert({
            where: { id: recipe.id },
            create: data,
            update: {
                ...data,
                ingredients: {
                    deleteMany: {},
                    create: data.ingredients.create,
                },
            },
        });
    }

    async findById(id: string): Promise<Recipe | null> {
        const prismaRecipe = await this.prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredients: {
                    include: { ingredient: true },
                    orderBy: { position: 'asc' },
                },
                aiExtraction: true,
            },
        });

        if (!prismaRecipe) return null;
        return RecipeMapper.toDomain(prismaRecipe);
    }

    async findBySourceUrl(url: string): Promise<Recipe | null> {
        const prismaRecipe = await this.prisma.recipe.findFirst({
            where: {
                aiExtraction: { sourceUrl: url },
            },
            include: {
                aiExtraction: true,
                ingredients: { include: { ingredient: true }, orderBy: { position: 'asc' } },
            },
        });

        if (!prismaRecipe) return null;
        return RecipeMapper.toDomain(prismaRecipe);
    }
}
