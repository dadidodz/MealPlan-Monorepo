import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { CreatePlannedMealUseCase } from '../application/create-planned-meal.use-case';
import { ListPlannedMealsUseCase } from '../application/list-planned-meals.use-case';
import { CreatePlannedMealDto } from './create-planned-meal.dto';
import { ListPlannedMealsQueryDto } from './list-planned-meals-query.dto';
import { PlannedMealPresenter } from './planned-meal.presenter';
import { PlannedMealResponseDto } from './planned-meal-response.dto';
import { PlannedMealSummaryResponseDto } from './planned-meal-summary-response.dto';

@Controller('planned-meals')
export class PlannedMealController {
    constructor(
        private readonly listPlannedMealsUseCase: ListPlannedMealsUseCase,
        private readonly createPlannedMealUseCase: CreatePlannedMealUseCase,
    ) {}

    @Get()
    async list(@Query() query: ListPlannedMealsQueryDto): Promise<PlannedMealSummaryResponseDto[]> {
        const meals = await this.listPlannedMealsUseCase.execute(
            Temporal.PlainDate.from(query.from),
            Temporal.PlainDate.from(query.to),
        );
        return meals.map((meal) => PlannedMealPresenter.toSummaryResponse(meal));
    }

    @Post()
    async create(@Body() dto: CreatePlannedMealDto): Promise<PlannedMealResponseDto> {
        const meal = await this.createPlannedMealUseCase.execute({
            ...dto,
            date: Temporal.PlainDate.from(dto.date),
        });
        return PlannedMealPresenter.toResponse(meal);
    }
}
