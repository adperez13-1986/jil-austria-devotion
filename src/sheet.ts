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

const ACCENT: [number, number, number] = [0.184, 0.365, 0.314];

/**
 * How much of a day fits.
 *
 * Paper is a fixed size, so the PDF still clips a runaway entry to keep the
 * sheet on one page. An image has no such limit — it just grows taller — so
 * nothing anyone writes is ever cut out of the shared picture.
 */
type Limits = { text: number; note: number };

const PAPER: Limits = { text: 1, note: 3 };
const UNLIMITED: Limits = { text: Infinity, note: Infinity };

type Row = { top: number; height: number; textLines: string[]; noteLines: string[] };

/** Where the reflection starts, pushed down by any extra Bible-text lines. */
function noteTop(textLines: string[]): number {
  return TEXT_TOP + Math.max(0, textLines.length - 1) * TEXT_LEADING + NOTE_GAP;
}

/** Row positions and wrapped lines, measured with the renderer's own metrics. */
function layout(week: Week, c: Surface, pageWidth: number, limits: Limits): Row[] {
  const width = pageWidth - MARGIN - COL_X;
  const rows: Row[] = [];
  let top = ROW_TOP;

  for (const day of week.days) {
    const text = day.text.trim();
    const note = day.note.trim();
    const textLines = text ? c.wrap(text, 'helv', TEXT_SIZE, width, limits.text) : [];
    const noteLines = note ? c.wrap(note, 'helv', NOTE_SIZE, width, limits.note) : [];

    const lastBaseline = noteTop(textLines) + Math.max(0, noteLines.length - 1) * NOTE_LEADING;
    const height = Math.max(ROW_MIN_H, lastBaseline + ROW_PAD);

    rows.push({ top, height, textLines, noteLines });
    top += height;
  }

  return rows;
}

function pageHeight(rows: Row[]): number {
  const last = rows[rows.length - 1];
  return Math.max(A4.height, last.top + last.height + FOOTER_H);
}

/** The printed checklist, filled in. Drawn once, rendered as PDF or as PNG. */
function drawWeek(week: Week, profile: Profile, limits: Limits): (c: Surface, page: PageBox) => void {
  const label = weekLabel(week.monday);
  const dates = datesOf(week.monday);

  return (c, page) => {
    const center = page.width / 2;
    const right = page.width - MARGIN;
    const rows = layout(week, c, page.width, limits);

    c.gray(0.1);
    c.textCentered('Devotion', center, 72, 'times', 27);

    c.gray(0.32);
    c.textCentered(label, center, 97, 'helv', 10.5);

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

    DAY_NAMES.forEach((dayName, i) => {
      const day = week.days[i];
      const row = rows[i];
      const top = row.top;
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
      c.text(shortDate(dates[i]), MARGIN + 34, top + 36, 'helv', 7.5);

      const x = COL_X;

      if (row.textLines.length) {
        c.gray(0.12);
        row.textLines.forEach((line, k) => {
          c.text(line, x, top + TEXT_TOP + k * TEXT_LEADING, 'helv', TEXT_SIZE);
        });
      } else {
        c.gray(0.55);
        c.text('Bible text', x, top + TEXT_TOP, 'helv', 8);
        c.gray(0.88);
        c.lineWidth(0.5);
        c.line(x + c.measure('Bible text', 'helv', 8) + 8, top + 19, right, top + 19);
      }

      const noteY = top + noteTop(row.textLines);

      if (row.noteLines.length) {
        c.gray(0.42);
        row.noteLines.forEach((line, k) => {
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

      if (i < DAY_NAMES.length - 1) {
        c.gray(0.91);
        c.lineWidth(0.4);
        c.line(MARGIN, top + row.height - 6, right, top + row.height - 6);
      }
    });

    const footer = [`${completed(week)} of 7 days`, profile.church.trim()].filter(Boolean).join('   ·   ');
    c.gray(0.58);
    c.textCentered(footer, center, page.height - FOOTER_BASE, 'helv', 8.5);
  };
}

export function weekAsPdf(week: Week, profile: Profile): Blob {
  return renderPdf(`Devotion — ${weekLabel(week.monday)}`, drawWeek(week, profile, PAPER));
}

export function weekAsPng(week: Week, profile: Profile): Promise<Blob> {
  return renderPng(
    A4.width,
    (c) => pageHeight(layout(week, c, A4.width, UNLIMITED)),
    drawWeek(week, profile, UNLIMITED),
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
