/**
 * Extracts YYYY-MM-DD from a Date or ISO datetime string without timezone conversion.
 * Prevents the UTC-midnight → local-time shift that causes date display off-by-one errors.
 *
 * Example: "2026-09-15T00:00:00.000Z" → "2026-09-15" (always, regardless of timezone)
 */
export function parseLocalDate(date: Date | string): string {
  const s = typeof date === 'string' ? date : date.toISOString();
  return s.slice(0, 10);
}

/**
 * Returns today's date as YYYY-MM-DD string (local time).
 */
export function todayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converts a YYYY-MM-DD string to a Date object at local midnight.
 * Used for date-only comparisons where you need < or > between dates.
 */
export function dateOnly(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
