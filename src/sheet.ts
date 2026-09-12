import { renderPdf, wrap, measure } from './pdf.ts';
import type { Week, Profile } from './store.ts';
import { completed } from './store.ts';
import { DAY_NAMES, datesOf, shortDate, weekLabel } from './week.ts';

const MARGIN = 54;
const ROW_TOP = 156;
const ROW_H = 88;

const ACCENT: [number, number, number] = [0.184, 0.365, 0.314];

/** One page that looks like the printed checklist, filled in. */
export function weekAsPdf(week: Week, profile: Profile): Blob {
  const label = weekLabel(week.monday);
  const dates = datesOf(week.monday);

  return renderPdf(`Devotion — ${label}`, (c, page) => {
    const center = page.width / 2;
    const right = page.width - MARGIN;

    c.ops.push('1 J', '1 j');

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
      const top = ROW_TOP + i * ROW_H;
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

      const x = MARGIN + 148;
      const width = right - x;

      if (day.text.trim()) {
        c.gray(0.12);
        c.text(day.text.trim(), x, top + 17, 'helv', 10.5);
      } else {
        c.gray(0.55);
        c.text('Bible text', x, top + 17, 'helv', 8);
        c.gray(0.88);
        c.lineWidth(0.5);
        c.line(x + measure('Bible text', 'helv', 8) + 8, top + 19, right, top + 19);
      }

      const note = day.note.trim();
      if (note) {
        c.gray(0.42);
        wrap(note, 'helv', 8.8, width, 3).forEach((line, k) => {
          c.text(line, x, top + 34 + k * 11.5, 'helv', 8.8);
        });
      } else {
        c.gray(0.55);
        c.text('Short reflection', x, top + 34, 'helv', 8);
        c.gray(0.9);
        c.lineWidth(0.5);
        c.line(x + measure('Short reflection', 'helv', 8) + 8, top + 36, right, top + 36);
        c.line(x, top + 50, right, top + 50);
      }

      if (i < DAY_NAMES.length - 1) {
        c.gray(0.91);
        c.lineWidth(0.4);
        c.line(MARGIN, top + ROW_H - 6, right, top + ROW_H - 6);
      }
    });

    const footer = [`${completed(week)} of 7 days`, profile.church.trim()].filter(Boolean).join('   ·   ');
    c.gray(0.58);
    c.textCentered(footer, center, 806, 'helv', 8.5);
  });
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

export function pdfFilename(week: Week, profile: Profile): string {
  const who = profile.name.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `Devotion-${week.monday}${who ? `-${who}` : ''}.pdf`;
}
