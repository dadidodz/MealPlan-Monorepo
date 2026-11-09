import { Controller, Get, Query } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { ListPlannedMealsUseCase } from '../application/list-planned-meals.use-case';
import { ListPlannedMealsQueryDto } from './list-planned-meals-query.dto';
import { PlannedMealPresenter } from './planned-meal.presenter';
import { PlannedMealSummaryResponseDto } from './planned-meal-summary-response.dto';

@Controller('planned-meals')
export class PlannedMealController {
    constructor(private readonly listPlannedMealsUseCase: ListPlannedMealsUseCase) {}

    @Get()
    async list(@Query() query: ListPlannedMealsQueryDto): Promise<PlannedMealSummaryResponseDto[]> {
        const meals = await this.listPlannedMealsUseCase.execute(
            Temporal.PlainDate.from(query.from),
            Temporal.PlainDate.from(query.to),
        );
        return meals.map((meal) => PlannedMealPresenter.toSummaryResponse(meal));
    }
}
