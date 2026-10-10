/**
 * Moving the app to a new address without losing anyone's weeks.
 *
 * localStorage belongs to one address, so the new site starts empty. The old
 * site packs every devotion:* key into the link's #fragment and forwards there;
 * the new site unpacks it before the app reads anything. The fragment never
 * reaches a server, so the reflections still only travel phone to phone.
 */

const PREFIX = 'devotion:';
const WEEK_PREFIX = 'devotion:week:';
const MARK = '#move=';

/** The old address that forwards, and where it forwards to. Build-time overridable for tests. */
const FROM_HOST: string = import.meta.env.VITE_MOVE_FROM ?? 'adperez13-1986.github.io';
const TO_URL: string = import.meta.env.VITE_MOVE_TO ?? 'https://devotion.jilaustria.com/';

type Payload = Record<string, string>;

function collect(): Payload {
  const out: Payload = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** 'z.' = deflated, 'j.' = plain JSON for browsers without CompressionStream. */
async function encode(payload: Payload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream === 'function') {
    return 'z.' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
  }
  return 'j.' + toBase64Url(json);
}

async function decode(text: string): Promise<Payload> {
  const [kind, body] = [text.slice(0, 2), text.slice(2)];
  let bytes = fromBase64Url(body);
  if (kind === 'z.') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  else if (kind !== 'j.') throw new Error('unknown move format');
  return JSON.parse(new TextDecoder().decode(bytes)) as Payload;
}

function weekHasContent(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const week = JSON.parse(raw) as { days?: { done?: boolean; text?: string; note?: string }[] };
    return (week.days ?? []).some((d) => d.done || d.text?.trim() || d.note?.trim());
  } catch {
    return false;
  }
}

/**
 * Keeps whatever this phone already has here: a moved key only fills a gap,
 * or replaces a week that is still empty. Opening the old shortcut again
 * after using the new site therefore never undoes newer writing.
 */
function merge(payload: Payload): number {
  let written = 0;
  for (const [key, value] of Object.entries(payload)) {
    if (!key.startsWith(PREFIX) || typeof value !== 'string') continue;
    const here = localStorage.getItem(key);
    const fills = here === null || (key.startsWith(WEEK_PREFIX) && !weekHasContent(here));
    if (!fills) continue;
    localStorage.setItem(key, value);
    written++;
  }
  return written;
}

/** On the old address: forward to the new one with the data. Returns true when leaving. */
export async function forwardIfOld(): Promise<boolean> {
  if (location.hostname !== FROM_HOST) return false;
  let hash = '';
  try {
    const payload = collect();
    if (Object.keys(payload).length) hash = MARK + (await encode(payload));
  } catch {
    // Storage blocked: nothing to carry, still send them to the new home.
  }
  location.replace(TO_URL + hash);
  return true;
}

/** On the new address: take in anything the old one sent, then tidy the link. */
export async function receiveMove(): Promise<void> {
  if (!location.hash.startsWith(MARK)) return;
  try {
    merge(await decode(location.hash.slice(MARK.length)));
  } catch {
    // A cut-off or garbled link: start clean rather than refuse to open.
  }
  history.replaceState(null, '', location.pathname + location.search);
}
