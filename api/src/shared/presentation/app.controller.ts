import { Temporal } from '@js-temporal/polyfill';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DependenciesProbe, DependenciesReport } from '../infrastructure/dependencies-probe';

@Controller('app')
export class AppController {
    constructor(private readonly dependenciesProbe: DependenciesProbe) {}

    @Get('health')
    getHealth(): { status: string; timestamp: Temporal.Instant } {
        return { status: 'ok', timestamp: Temporal.Now.instant() };
    }

    /** For Uptime Kuma: 503 as soon as one host the extraction needs can't be reached. */
    @Get('health/dependencies')
    async getDependencies(): Promise<{ status: 'ok'; dependencies: DependenciesReport }> {
        const dependencies = await this.dependenciesProbe.check();
        if (Object.values(dependencies).includes('failing')) {
            throw new ServiceUnavailableException({ status: 'failing', dependencies });
        }
        return { status: 'ok', dependencies };
    }
}
