import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { IngredientModule } from './modules/ingredient/ingredient.module';
import { AppController } from './shared/presentation/app.controller';
import { SharedModule } from './shared/shared.module';
import { DomainErrorFilter } from './shared/presentation/domain-error.filter';
import { DependenciesProbe } from './shared/infrastructure/dependencies-probe';

@Module({
    imports: [SharedModule, PrismaModule, RecipeModule, IngredientModule],
    controllers: [AppController],
    providers: [
        DependenciesProbe,
        { provide: APP_FILTER, useClass: DomainErrorFilter },
        {
            // Registered here rather than in main.ts so e2e tests (built from AppModule) validate like production
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist: true, // Strips properties that are not in the DTO
                forbidNonWhitelisted: true, // Rejects requests with unknown properties
                transform: true, // Turns payloads into DTO class instances
            }),
        },
    ],
})
export class AppModule {}
