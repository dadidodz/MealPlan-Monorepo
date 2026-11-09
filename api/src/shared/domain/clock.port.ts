import { Temporal } from '@js-temporal/polyfill';

export const CLOCK = Symbol('Clock');

export interface Clock {
    now(): Temporal.Instant;
}
