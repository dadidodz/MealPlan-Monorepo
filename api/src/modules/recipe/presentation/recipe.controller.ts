import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Get,
    Param,
    MessageEvent,
    Sse,
    Query,
    ParseUUIDPipe,
    BadRequestException,
    Patch,
} from '@nestjs/common';
import { CreateRecipeDto } from './create-recipe.dto';
import { ListRecipesQueryDto } from './list-recipes-query.dto';
import { CreateRecipeUseCase } from '../application/create-recipe.use-case';
import { RecipePresenter } from './recipe.presenter';
import { withHeartbeat } from './sse-heartbeat';
import { GetAllRecipesUseCase } from '../application/get-all-recipes.use-case';
import { RecipeResponseDto } from './recipe-response.dto';
import { GetRecipeByIdUseCase } from '../application/get-recipe-by-id.use-case';
import { ExtractRecipeDraftUseCase } from '../application/extract-recipe-draft.use-case';
import { Observable } from 'rxjs';
import { ExtractRecipeRequestDto } from './extract-recipe-request.dto';
import { ExtractionResultResponseDto } from './extract-response.dto';
import { ExtractedRecipeDraftResponseDto } from './extracted-recipe-draft-response.dto';
import { RecipeSummaryResponseDto } from './recipe-summary-response.dto';
import { GetCachedExtractionUseCase } from '../application/get-cached-extraction.use-case';
import { UpdateRecipeDto } from './update-recipe.dto';
import { UpdateRecipeUseCase } from '../application/update-recipe.use-case';
import { RecipeNotFoundError } from '../domain/recipe-not-found.error';

/** A malformed id can't match any recipe: answer like an unknown one (404 RECIPE_NOT_FOUND), not 400. */
const recipeIdPipe = new ParseUUIDPipe({
    exceptionFactory: () => new RecipeNotFoundError('(malformed id)'),
});

@Controller('recipes')
export class RecipeController {
    constructor(
        private readonly createRecipeUseCase: CreateRecipeUseCase,
        private readonly getAllRecipesUseCase: GetAllRecipesUseCase,
        private readonly getRecipeByIdUseCase: GetRecipeByIdUseCase,
        private readonly extractRecipeDraftUseCase: ExtractRecipeDraftUseCase,
        private readonly getCachedExtractionUseCase: GetCachedExtractionUseCase,
        private readonly updateRecipeUseCase: UpdateRecipeUseCase,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createRecipeDto: CreateRecipeDto): Promise<RecipeResponseDto> {
        const command = {
            title: createRecipeDto.title,
            description: createRecipeDto.description ?? null,
            basePortions: createRecipeDto.basePortions,
            instructions: createRecipeDto.instructions,
            sourceUrl: createRecipeDto.sourceUrl ?? null,
            ingredients: createRecipeDto.ingredients.map((i) => ({
                name: i.name,
                quantity: i.quantity ?? null,
                unit: i.unit ?? null,
                isIgnoredInShoppingList: i.isIgnoredInShoppingList ?? false,
            })),
            category: createRecipeDto.category,
            imageUrl: createRecipeDto.imageUrl ?? null,
        };

        const recipe = await this.createRecipeUseCase.execute(command);

        return RecipePresenter.toResponse(recipe);
    }

    @Post('extract')
    @HttpCode(HttpStatus.OK)
    public requestExtraction(
        @Body() payload: ExtractRecipeRequestDto,
    ): Promise<ExtractionResultResponseDto> {
        const extractionResult = this.extractRecipeDraftUseCase.execute(payload.url);
        return extractionResult;
    }

    @Sse('stream/:jobId')
    public streamExtraction(@Param('jobId') jobId: string): Observable<MessageEvent> {
        return withHeartbeat(this.extractRecipeDraftUseCase.getJobStream(jobId));
    }

    @Get('extract/cached')
    public async getCachedExtraction(
        @Query('url') url: string,
    ): Promise<ExtractedRecipeDraftResponseDto> {
        if (!url) {
            throw new BadRequestException('The url query parameter is required');
        }
        const draft = await this.getCachedExtractionUseCase.execute(url);

        return RecipePresenter.toDraftResponse(draft);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() query: ListRecipesQueryDto): Promise<RecipeSummaryResponseDto[]> {
        const recipes = await this.getAllRecipesUseCase.execute(query.page, query.limit);

        return recipes.map((recipe) => RecipePresenter.toSummaryResponse(recipe));
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id', recipeIdPipe) id: string): Promise<RecipeResponseDto> {
        const recipe = await this.getRecipeByIdUseCase.execute(id);

        return RecipePresenter.toResponse(recipe);
    }

    @Patch(':id')
    async updateRecipe(
        @Param('id', recipeIdPipe) id: string,
        @Body() dto: UpdateRecipeDto,
    ): Promise<RecipeResponseDto> {
        const updatedRecipe = await this.updateRecipeUseCase.execute({
            id,
            title: dto.title,
            description: dto.description,
            basePortions: dto.basePortions,
            instructions: dto.instructions,
            category: dto.category,
            imageUrl: dto.imageUrl,
            ingredients: dto.ingredients?.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                isIgnoredInShoppingList: i.isIgnoredInShoppingList,
            })),
        });

        // The presenter maps the domain entity to the response DTO
        return RecipePresenter.toResponse(updatedRecipe);
    }
}
