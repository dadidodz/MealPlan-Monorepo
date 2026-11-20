// IsISO8601 alone also accepts a time or `2026-W45-1`. PostgreSQL has no year 0, hence the first digit.
export const CALENDAR_DAY = /^[1-9]\d{3}-\d{2}-\d{2}$/;
