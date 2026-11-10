import { Module } from '@nestjs/common';
import { ListPlannedMealsUseCase } from './application/list-planned-meals.use-case';
import { PLANNED_MEAL_READER, PlannedMealReader } from './domain/planned-meal-reader.port';
import { PrismaPlannedMealReader } from './infrastructure/prisma-planned-meal.reader';
import { PlannedMealController } from './presentation/planned-meal.controller';

@Module({
    controllers: [PlannedMealController],
    providers: [
        // Ports → adapters
        { provide: PLANNED_MEAL_READER, useClass: PrismaPlannedMealReader },

        // Use cases, built from the ports
        {
            provide: ListPlannedMealsUseCase,
            useFactory: (reader: PlannedMealReader): ListPlannedMealsUseCase =>
                new ListPlannedMealsUseCase(reader),
            inject: [PLANNED_MEAL_READER],
        },
    ],
})
export class PlanningModule {}
