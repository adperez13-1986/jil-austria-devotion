/**
 * All data lives in this browser. No account, no server, nothing leaves the
 * phone until the member taps Share.
 */

export type DayEntry = {
  done: boolean;
  /** Bible text, e.g. "John 3:16-21" */
  text: string;
  /** Short reflection */
  note: string;
};

export type Week = {
  monday: string;
  days: DayEntry[];
};

export type Profile = {
  name: string;
  lifegroup: string;
  church: string;
  /** 'HH:MM' for the daily calendar reminder. */
  reminderTime: string;
  /** Stable across edits so re-adding updates the event instead of duplicating it. */
  reminderUid: string;
  reminderSequence: number;
};

const WEEK_PREFIX = 'devotion:week:';
const PROFILE_KEY = 'devotion:profile';

function blankDay(): DayEntry {
  return { done: false, text: '', note: '' };
}

export function blankWeek(monday: string): Week {
  return { monday, days: Array.from({ length: 7 }, blankDay) };
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota. Losing a reflection is bad but silent
    // failure is better than a crash mid-typing; the UI stays usable.
  }
}

export function loadWeek(monday: string): Week {
  const stored = read<Week>(WEEK_PREFIX + monday);
  if (!stored || !Array.isArray(stored.days)) return blankWeek(monday);
  const days = Array.from({ length: 7 }, (_, i) => ({ ...blankDay(), ...stored.days[i] }));
  return { monday, days };
}

export function saveWeek(week: Week): void {
  write(WEEK_PREFIX + week.monday, week);
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  lifegroup: '',
  church: 'JIL Austria',
  reminderTime: '06:00',
  reminderUid: '',
  reminderSequence: 0,
};

export function loadProfile(): Profile {
  return { ...DEFAULT_PROFILE, ...read<Profile>(PROFILE_KEY) };
}

export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, profile);
}

export function completed(week: Week): number {
  return week.days.filter((d) => d.done).length;
}

/** True once anything has been typed or ticked — used to skip empty weeks. */
export function hasContent(week: Week): boolean {
  return week.days.some((d) => d.done || d.text.trim() || d.note.trim());
}
