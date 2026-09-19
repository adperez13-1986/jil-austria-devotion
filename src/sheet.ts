import { A4, renderPdf } from './pdf.ts';
import { renderPng } from './raster.ts';
import type { PageBox, Surface } from './surface.ts';
import type { Week, Profile } from './store.ts';
import { completed } from './store.ts';
import { DAY_NAMES, datesOf, shortDate, weekLabel } from './week.ts';

const MARGIN = 54;
const ROW_TOP = 156;
/** A day with little in it still gets a full-size row, as it always has. */
const ROW_MIN_H = 88;
/** Room under the last row for the footer, and the footer's own baseline above
 *  the bottom edge — which keeps it where it has always sat on an A4 page. */
const FOOTER_H = 70;
const FOOTER_BASE = 35.89;
/** Left edge of the written column, and the whitespace kept under a row. */
const COL_X = MARGIN + 148;
const ROW_PAD = 31;

const TEXT_SIZE = 10.5;
const TEXT_LEADING = 13;
/** Baseline of the first Bible-text line, from the top of its row. */
const TEXT_TOP = 17;

const NOTE_SIZE = 8.8;
const NOTE_LEADING = 11.5;
/** Gap between the Bible text and the reflection under it. */
const NOTE_GAP = 17;
/** Where a reflection picks up again on the next page. */
const CONT_TOP = 12;
/** Fewer lines than this left at the foot of a page, and the reflection starts
 *  on the next one instead of leaving an orphan behind. */
const MIN_SPLIT = 3;

/** Lowest a row may reach on paper, leaving the footer its line. */
const PAPER_BOTTOM = A4.height - FOOTER_BASE - 24;

const ACCENT: [number, number, number] = [0.184, 0.365, 0.314];

/**
 * One day on one page: the whole row, or — when a long reflection runs past the
 * bottom of the paper — the head of it, with the rest carried over.
 */
type Piece = {
  day: number;
  top: number;
  height: number;
  /** False for the tail of a reflection continued from the page before. */
  head: boolean;
  textLines: string[];
  noteLines: string[];
  rule: boolean;
};

/** Where the reflection starts, pushed down by any extra Bible-text lines. */
function noteTop(textLines: string[]): number {
  return TEXT_TOP + Math.max(0, textLines.length - 1) * TEXT_LEADING + NOTE_GAP;
}

function pieceHeight(head: boolean, start: number, lines: number): number {
  return Math.max(head ? ROW_MIN_H : 0, start + Math.max(0, lines - 1) * NOTE_LEADING + ROW_PAD);
}

/**
 * Lay the week out, measured with the renderer's own font metrics, and break it
 * into pages once a page has no more room. `bottom` is Infinity for the image,
 * which is one page however tall it turns out to be.
 */
function plan(week: Week, c: Surface, pageWidth: number, bottom: number): Piece[][] {
  const width = pageWidth - MARGIN - COL_X;
  const pages: Piece[][] = [[]];
  let top = ROW_TOP;

  const turn = () => { pages.push([]); top = ROW_TOP; };

  week.days.forEach((day, index) => {
    const text = day.text.trim();
    const note = day.note.trim();
    const textLines = text ? c.wrap(text, 'helv', TEXT_SIZE, width, Infinity) : [];
    let noteLines = note ? c.wrap(note, 'helv', NOTE_SIZE, width, Infinity) : [];
    let head = true;

    for (;;) {
      const current = pages[pages.length - 1];
      const start = head ? noteTop(textLines) : CONT_TOP;
      const room = bottom - top;
      const whole = pieceHeight(head, start, noteLines.length);
      // How many reflection lines still fit under everything above them.
      const fits = Math.floor((room - ROW_PAD - start) / NOTE_LEADING) + 1;
      const splittable = noteLines.length > fits && fits >= (current.length ? MIN_SPLIT : 1);

      if (whole > room && !splittable && current.length) { turn(); continue; }

      const take = whole <= room ? noteLines.length : Math.max(fits, 1);
      const height = pieceHeight(head, start, take);
      current.push({
        day: index,
        top,
        height,
        head,
        textLines: head ? textLines : [],
        noteLines: noteLines.slice(0, take),
        rule: false,
      });
      top += height;

      noteLines = noteLines.slice(take);
      if (!noteLines.length) break;
      head = false;
      turn();
    }
  });

  // A hairline under every row but the last one on its page.
  for (const page of pages) {
    page.forEach((piece, i) => { piece.rule = i < page.length - 1; });
  }

  return pages;
}

function pageHeight(pieces: Piece[]): number {
  const last = pieces[pieces.length - 1];
  return Math.max(A4.height, last.top + last.height + FOOTER_H);
}

/** The printed checklist, filled in. Drawn once, rendered as PDF or as PNG. */
function drawPage(
  week: Week,
  profile: Profile,
  pages: Piece[][],
  index: number,
): (c: Surface, page: PageBox) => void {
  const label = weekLabel(week.monday);
  const dates = datesOf(week.monday);

  return (c, page) => {
    const center = page.width / 2;
    const right = page.width - MARGIN;

    c.gray(0.1);
    c.textCentered('Devotion', center, 72, 'times', 27);

    c.gray(0.32);
    c.textCentered(index ? `${label}   ·   continued` : label, center, 97, 'helv', 10.5);

    const who = [profile.name.trim(), profile.lifegroup.trim() && `Lifegroup: ${profile.lifegroup.trim()}`]
      .filter(Boolean)
      .join('   ·   ');
    if (who) {
      c.gray(0.52);
      c.textCentered(who, center, 114, 'helv', 9);
    }

    c.gray(0.85);
    c.lineWidth(0.6);
    c.line(MARGIN, 132, right, 132);

    for (const piece of pages[index]) {
      const day = week.days[piece.day];
      const dayName = DAY_NAMES[piece.day];
      const top = piece.top;
      const x = COL_X;

      if (piece.head) {
        const cx = MARGIN + 12;
        const cy = top + 15;

        if (day.done) {
          c.rgb(...ACCENT);
          c.circle(cx, cy, 10.5, 'fill');
          c.gray(1);
          c.lineWidth(1.7);
          c.polyline([
            [cx - 4.4, cy + 0.2],
            [cx - 1.5, cy + 3.6],
            [cx + 4.7, cy - 3.5],
          ]);
        } else {
          c.gray(0.68);
          c.lineWidth(1.1);
          c.circle(cx, cy, 10.5, 'stroke');
        }

        c.gray(0.92);
        c.rect(MARGIN + 34, top + 5, 100, 19);
        c.gray(0.25);
        c.text(dayName.toUpperCase(), MARGIN + 42, top + 17.8, 'helvBold', 8, 1.1);

        c.gray(0.55);
        c.text(shortDate(dates[piece.day]), MARGIN + 34, top + 36, 'helv', 7.5);

        if (piece.textLines.length) {
          c.gray(0.12);
          piece.textLines.forEach((line, k) => {
            c.text(line, x, top + TEXT_TOP + k * TEXT_LEADING, 'helv', TEXT_SIZE);
          });
        } else {
          c.gray(0.55);
          c.text('Bible text', x, top + TEXT_TOP, 'helv', 8);
          c.gray(0.88);
          c.lineWidth(0.5);
          c.line(x + c.measure('Bible text', 'helv', 8) + 8, top + 19, right, top + 19);
        }
      } else {
        c.gray(0.6);
        c.text(`${dayName.slice(0, 3).toUpperCase()}, CONT.`, MARGIN + 34, top + CONT_TOP, 'helv', 7.5, 0.6);
      }

      const noteY = top + (piece.head ? noteTop(piece.textLines) : CONT_TOP);

      if (piece.noteLines.length) {
        c.gray(0.42);
        piece.noteLines.forEach((line, k) => {
          c.text(line, x, noteY + k * NOTE_LEADING, 'helv', NOTE_SIZE);
        });
      } else {
        c.gray(0.55);
        c.text('Short reflection', x, noteY, 'helv', 8);
        c.gray(0.9);
        c.lineWidth(0.5);
        c.line(x + c.measure('Short reflection', 'helv', 8) + 8, noteY + 2, right, noteY + 2);
        c.line(x, noteY + 16, right, noteY + 16);
      }

      if (piece.rule) {
        c.gray(0.91);
        c.lineWidth(0.4);
        c.line(MARGIN, top + piece.height - 6, right, top + piece.height - 6);
      }
    }

    const footer = [
      `${completed(week)} of 7 days`,
      profile.church.trim(),
      pages.length > 1 && `Page ${index + 1} of ${pages.length}`,
    ].filter(Boolean).join('   ·   ');
    c.gray(0.58);
    c.textCentered(footer, center, page.height - FOOTER_BASE, 'helv', 8.5);
  };
}

export function weekAsPdf(week: Week, profile: Profile): Blob {
  // Paper is a fixed size, so a week of long reflections runs onto a second
  // page rather than losing its tail. Measured once, with the writer's own
  // metrics, then reused for every page it turns out to need.
  let pages: Piece[][] | null = null;
  const paginate = (c: Surface) => (pages ??= plan(week, c, A4.width, PAPER_BOTTOM));

  return renderPdf(
    `Devotion — ${weekLabel(week.monday)}`,
    (c) => paginate(c).length,
    (c, page, index) => drawPage(week, profile, paginate(c), index)(c, page),
  );
}

export function weekAsPng(week: Week, profile: Profile): Promise<Blob> {
  // An image has no page to run off, so the whole week stays on one tall sheet.
  let pages: Piece[][] | null = null;
  const layout = (c: Surface) => (pages ??= plan(week, c, A4.width, Infinity));

  return renderPng(
    A4.width,
    (c) => pageHeight(layout(c)[0]),
    (c, page) => drawPage(week, profile, layout(c), 0)(c, page),
  );
}

/** Plain text for pasting into Messenger, Viber or a group chat. */
export function weekAsText(week: Week, profile: Profile): string {
  const dates = datesOf(week.monday);
  const lines: string[] = [`Devotion — ${weekLabel(week.monday)}`];

  const who = [profile.name.trim(), profile.lifegroup.trim() && `Lifegroup: ${profile.lifegroup.trim()}`]
    .filter(Boolean)
    .join(' · ');
  if (who) lines.push(who);
  lines.push('');

  DAY_NAMES.forEach((dayName, i) => {
    const day = week.days[i];
    const mark = day.done ? '✓' : '·';
    const head = `${mark} ${dayName.slice(0, 3)} ${shortDate(dates[i])}`;
    lines.push(day.text.trim() ? `${head} — ${day.text.trim()}` : head);
    if (day.note.trim()) lines.push(`   ${day.note.trim()}`);
  });

  lines.push('', `${completed(week)} of 7 days`);
  return lines.join('\n');
}

export function sheetFilename(week: Week, profile: Profile, extension: string): string {
  const who = profile.name.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `Devotion-${week.monday}${who ? `-${who}` : ''}.${extension}`;
}
