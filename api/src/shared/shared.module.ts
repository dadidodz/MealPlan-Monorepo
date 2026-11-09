import { Global, Module } from '@nestjs/common';
import { CLOCK } from './domain/clock.port';
import { SystemClock } from './infrastructure/system-clock';

@Global()
@Module({
    providers: [{ provide: CLOCK, useClass: SystemClock }],
    exports: [CLOCK],
})
export class SharedModule {}
