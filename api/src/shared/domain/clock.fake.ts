import { Temporal } from '@js-temporal/polyfill';
import { Clock } from './clock.port';

export class FixedClock implements Clock {
    constructor(private current: Temporal.Instant) {}

    now(): Temporal.Instant {
        return this.current;
    }

    advance(duration: Temporal.DurationLike): void {
        this.current = this.current.add(duration);
    }
}
