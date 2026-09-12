/**
 * Daily reminders, as a calendar event.
 *
 * Browsers have no way to schedule a notification for later — the app would
 * have to be running, or a push server would have to wake it, and a push
 * server is a bill and a backend. A repeating calendar event with an alarm
 * does the same job: it fires on a locked phone at the chosen time, on both
 * iPhone and Android, and costs nothing to run.
 */

const PRODID = '-//JIL Austria//Devotion//EN';

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** iCalendar lines wrap at 75 octets, continued by a leading space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = rest.slice(74);
  }
  parts.push(rest);
  return parts.join('\r\n ');
}

function stampUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Local wall-clock time with no zone, so the alarm stays at 6am if they travel. */
function stampFloating(date: Date): string {
  const p = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}00`;
}

/** The next occurrence of `HH:MM` — today if it has not passed, else tomorrow. */
export function firstOccurrence(time: string, now = new Date()): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  return start;
}

export function newReminderUid(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `devotion-${Date.now().toString(36)}-${random}@jilaustria`;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function buildIcs(time: string, uid: string, sequence: number): Blob {
  const appUrl = `${location.origin}${import.meta.env.BASE_URL}`;
  const start = firstOccurrence(time);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${stampUtc(new Date())}`,
    `DTSTART:${stampFloating(start)}`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    'TRANSP:TRANSPARENT',
    'SUMMARY:Devotion',
    `DESCRIPTION:${escapeText(`Time with the Lord. Log today's reading:\n${appUrl}`)}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT0S',
    'DESCRIPTION:Devotion',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const body = lines.map(fold).join('\r\n') + '\r\n';
  return new Blob([body], { type: 'text/calendar;charset=utf-8' });
}
