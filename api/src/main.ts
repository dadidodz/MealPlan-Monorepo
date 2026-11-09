import { NestFactory } from '@nestjs/core';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { AppModule } from './app.module';

// From dist/src/main.js to the monorepo root, where the hand-written contract lives (contracts/)
const CONTRACT_PATH = join(__dirname, '..', '..', '..', 'contracts', 'openapi.yaml');

/** Only checks what Swagger UI needs; the contract's content is checked by the API tests. */
function isOpenApiDocument(value: unknown): value is OpenAPIObject {
    return typeof value === 'object' && value !== null && 'openapi' in value && 'paths' in value;
}

function loadContract(): OpenAPIObject {
    const document: unknown = parse(readFileSync(CONTRACT_PATH, 'utf8'));
    if (!isOpenApiDocument(document)) {
        throw new Error(`${CONTRACT_PATH} is not an OpenAPI document`);
    }
    return document;
}

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        // origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        // allowedHeaders: ['Content-Type', 'Authorization'],
        // credentials: true,
    });

    app.setGlobalPrefix('api');
    // Swagger UI shows the hand-written contract (not generated from decorators); also serves it at /api/docs-json
    SwaggerModule.setup('api/docs', app, loadContract());
    // Runs onModuleDestroy hooks (Prisma disconnect) on SIGTERM, e.g. docker stop
    app.enableShutdownHooks();

    // No host: Node listens on '::' (IPv6 + IPv4, all interfaces), so `localhost` works whether it resolves to ::1 or 127.0.0.1
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
