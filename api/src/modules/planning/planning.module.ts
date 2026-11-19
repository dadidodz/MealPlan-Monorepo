import { Module } from '@nestjs/common';
import { CreatePlannedMealUseCase } from './application/create-planned-meal.use-case';
import { ListPlannedMealsUseCase } from './application/list-planned-meals.use-case';
import { PLANNED_MEAL_READER, PlannedMealReader } from './domain/planned-meal-reader.port';
import {
    PLANNED_MEAL_REPOSITORY,
    PlannedMealRepository,
} from './domain/planned-meal-repository.port';
import { PrismaPlannedMealReader } from './infrastructure/prisma-planned-meal.reader';
import { PrismaPlannedMealRepository } from './infrastructure/prisma-planned-meal.repository';
import { PlannedMealController } from './presentation/planned-meal.controller';

@Module({
    controllers: [PlannedMealController],
    providers: [
        // Ports → adapters
        { provide: PLANNED_MEAL_READER, useClass: PrismaPlannedMealReader },
        { provide: PLANNED_MEAL_REPOSITORY, useClass: PrismaPlannedMealRepository },

        // Use cases, built from the ports
        {
            provide: ListPlannedMealsUseCase,
            useFactory: (reader: PlannedMealReader): ListPlannedMealsUseCase =>
                new ListPlannedMealsUseCase(reader),
            inject: [PLANNED_MEAL_READER],
        },
        {
            provide: CreatePlannedMealUseCase,
            useFactory: (
                repository: PlannedMealRepository,
                reader: PlannedMealReader,
            ): CreatePlannedMealUseCase => new CreatePlannedMealUseCase(repository, reader),
            inject: [PLANNED_MEAL_REPOSITORY, PLANNED_MEAL_READER],
        },
    ],
})
export class PlanningModule {}
