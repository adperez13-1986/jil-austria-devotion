/** Monday-first week helpers. Everything is keyed by the ISO date of a Monday. */

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The Monday on or before `date`. */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0
  d.setDate(d.getDate() - offset);
  return d;
}

export function thisMonday(): string {
  return toKey(mondayOf(new Date()));
}

export function shiftWeek(mondayKey: string, weeks: number): string {
  const d = fromKey(mondayKey);
  d.setDate(d.getDate() + weeks * 7);
  return toKey(d);
}

/** The seven dates of the week starting at `mondayKey`. */
export function datesOf(mondayKey: string): Date[] {
  const start = fromKey(mondayKey);
  return DAY_NAMES.map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** "Sep 7 – 13, 2026", or "Sep 28 – Oct 4, 2026" when the week straddles months. */
export function weekLabel(mondayKey: string): string {
  const days = datesOf(mondayKey);
  const a = days[0];
  const b = days[6];
  const left = `${MONTHS[a.getMonth()]} ${a.getDate()}`;
  const right =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
      ? `${b.getDate()}`
      : `${MONTHS[b.getMonth()]} ${b.getDate()}`;
  return `${left} – ${right}, ${b.getFullYear()}`;
}

export function shortDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function isToday(date: Date): boolean {
  return toKey(date) === toKey(new Date());
}

export function isFuture(date: Date): boolean {
  const today = new Date();
  return date > new Date(today.getFullYear(), today.getMonth(), today.getDate());
}
