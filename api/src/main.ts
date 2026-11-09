import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        // origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        // allowedHeaders: ['Content-Type', 'Authorization'],
        // credentials: true,
    });

    app.setGlobalPrefix('api');
    // Runs onModuleDestroy hooks (Prisma disconnect) on SIGTERM, e.g. docker stop
    app.enableShutdownHooks();

    // No host: Node listens on '::' (IPv6 + IPv4, all interfaces), so `localhost` works whether it resolves to ::1 or 127.0.0.1
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
