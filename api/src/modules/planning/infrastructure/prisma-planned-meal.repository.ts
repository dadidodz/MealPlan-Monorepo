import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RecipeNotFoundError } from '../../recipe/domain/recipe-not-found.error';
import { PlannedMeal } from '../domain/planned-meal.entity';
import { PlannedMealRepository } from '../domain/planned-meal-repository.port';
import { SlotAlreadyTakenError } from '../domain/slot-already-taken.error';
import { toDate } from './planned-meal.mapper';

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class PrismaPlannedMealRepository implements PlannedMealRepository {
    constructor(private readonly prisma: PrismaService) {}

    // No "is it free?" check first: two devices could both pass it. Only the database's constraints guard the slot
    async add(meal: PlannedMeal): Promise<void> {
        try {
            await this.prisma.plannedMeal.create({
                data: {
                    id: meal.id,
                    date: toDate(meal.date),
                    mealType: meal.mealType,
                    peopleCount: meal.peopleCount,
                    recipeId: meal.recipeId,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === UNIQUE_VIOLATION) {
                    throw new SlotAlreadyTakenError(meal.date, meal.mealType);
                }
                if (error.code === FOREIGN_KEY_VIOLATION) {
                    throw new RecipeNotFoundError(meal.recipeId);
                }
            }
            throw error;
        }
    }
}
