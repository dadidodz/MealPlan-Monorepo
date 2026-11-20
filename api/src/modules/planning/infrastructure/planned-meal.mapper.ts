import { Temporal } from '@js-temporal/polyfill';

// Prisma represents a `@db.Date` column as a `Date` at midnight UTC, whatever the server's time zone
export function toDate(day: Temporal.PlainDate): Date {
    return new Date(day.toZonedDateTime('UTC').epochMilliseconds);
}

export function toPlainDate(date: Date): Temporal.PlainDate {
    return Temporal.Instant.fromEpochMilliseconds(date.getTime())
        .toZonedDateTimeISO('UTC')
        .toPlainDate();
}
