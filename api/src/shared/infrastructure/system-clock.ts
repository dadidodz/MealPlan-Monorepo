import { Temporal } from '@js-temporal/polyfill';
import { Clock } from '../domain/clock.port';

export class SystemClock implements Clock {
    now(): Temporal.Instant {
        return Temporal.Now.instant();
    }
}
