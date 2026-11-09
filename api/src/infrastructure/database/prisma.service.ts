import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        // 1. Prisma 7 needs a connection pool from the native 'pg' driver
        const connectionString = process.env.DATABASE_URL;
        const pool = new Pool({ connectionString });

        // 2. Hand the pool to the official Prisma adapter
        const adapter = new PrismaPg(pool);

        // 3. The parent constructor requires the adapter
        super({ adapter });
    }

    async onModuleInit(): Promise<void> {
        try {
            Logger.log('Connecting to the PostgreSQL database...', 'PrismaService');
            await this.$queryRawUnsafe('SELECT 1');
            Logger.log('Database connection established ✅', 'PrismaService');
        } catch (error) {
            Logger.error(
                'CRITICAL: cannot connect to the database. Shutting down.',
                error,
                'PrismaService',
            );
            throw new Error(
                'DatabaseConnectionError: connection to PostgreSQL failed. Check that the Docker container is running.',
                { cause: error },
            );
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
        Logger.log('Database connection closed', 'PrismaService');
    }
}
