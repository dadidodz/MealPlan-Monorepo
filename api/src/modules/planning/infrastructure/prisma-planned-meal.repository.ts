/* eslint-disable @typescript-eslint/no-unused-vars -- red TDD commit: a skeleton whose bodies come with the green commit */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PlannedMeal } from '../domain/planned-meal.entity';
import { PlannedMealRepository } from '../domain/planned-meal-repository.port';

@Injectable()
export class PrismaPlannedMealRepository implements PlannedMealRepository {
    constructor(private readonly prisma: PrismaService) {}

    add(meal: PlannedMeal): Promise<void> {
        throw new Error('Not implemented');
    }
}
