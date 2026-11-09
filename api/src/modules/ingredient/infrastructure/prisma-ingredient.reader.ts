import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IngredientReader, IngredientSummary } from '../domain/ingredient-reader.port';

@Injectable()
export class PrismaIngredientReader implements IngredientReader {
    constructor(private readonly prisma: PrismaService) {}

    searchByCode(codeFragment: string): Promise<IngredientSummary[]> {
        return this.prisma.ingredient.findMany({
            select: { id: true, name: true, code: true, category: true },
            where: { code: { contains: codeFragment } },
            orderBy: { name: 'asc' },
            take: 10,
        });
    }
}
