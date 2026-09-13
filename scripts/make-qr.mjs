/**
 * Builds the QR code for the app, plus the two things it actually gets used
 * in: a 16:9 slide to project, and an A4 sheet to print and pin up.
 *
 *     npm i -D --no-save qrcode
 *     node scripts/make-qr.mjs
 *
 * Needs `rsvg-convert` (brew install librsvg) for the PNGs. Output goes to qr/.
 */

import QRCode from 'qrcode';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_TEXT = process.env.QR_URL ?? 'https://adperez13-1986.github.io/jil-austria-devotion/';
const OUT = 'qr';

const PAPER = '#FBF9F5';
const INK = '#23211C';
const SOFT = '#6C665A';
const FAINT = '#A49C8D';
const ACCENT = '#2F5D50';
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Helvetica, Arial, sans-serif';

/**
 * The dark modules as one path. Level M is the usual balance: enough error
 * correction to survive a crease or a bad projector, without so many modules
 * that the squares get small to scan from the back of a room.
 */
function qrPath(size) {
  const qr = QRCode.create(URL_TEXT, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size;
  const data = qr.modules.data;
  const cell = size / count;

  const parts = [];
  for (let row = 0; row < count; row++) {
    let run = 0;
    for (let col = 0; col <= count; col++) {
      const dark = col < count && data[row * count + col];
      if (dark) { run += 1; continue; }
      if (run) {
        const x = (col - run) * cell;
        const y = row * cell;
        // Overdraw by a hair so neighbouring runs do not leave hairline seams.
        parts.push(`M${x.toFixed(2)} ${y.toFixed(2)}h${(run * cell + 0.05).toFixed(2)}v${(cell + 0.05).toFixed(2)}h-${(run * cell + 0.05).toFixed(2)}z`);
        run = 0;
      }
    }
  }
  return { path: parts.join(''), count };
}

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function text(value, x, y, { size, font = SANS, fill = INK, weight = 400, anchor = 'middle' }) {
  return `<text x="${x}" y="${y}" font-family='${font}' font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escape(value)}</text>`;
}

/** The code on a white card, which is what makes it scan off a warm background. */
function card(x, y, size, pad) {
  const { path } = qrPath(size - pad * 2);
  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.045}" fill="#ffffff"/>
    <g transform="translate(${x + pad} ${y + pad})"><path d="${path}" fill="#111111"/></g>`;
}

function slide() {
  const W = 1920;
  const H = 1080;
  const QR = 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${text('Devotion', W / 2, 148, { size: 92, font: SERIF })}
  ${text('Your weekly devotion checklist', W / 2, 205, { size: 34, fill: SOFT })}
  ${card((W - QR) / 2, 250, QR, 38)}
  ${text(URL_TEXT.replace(/^https:\/\//, ''), W / 2, 917, { size: 29, fill: SOFT })}
  ${text('Scan to open, then add it to your home screen', W / 2, 985, { size: 36, fill: ACCENT, weight: 600 })}
</svg>`;
}

function poster() {
  const W = 2480;
  const H = 3508;
  const QR = 1440;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${text('Devotion', W / 2, 540, { size: 210, font: SERIF })}
  ${text('Your weekly devotion checklist', W / 2, 668, { size: 76, fill: SOFT })}
  ${card((W - QR) / 2, 880, QR, 88)}
  ${text(URL_TEXT.replace(/^https:\/\//, ''), W / 2, 2470, { size: 62, fill: SOFT })}
  ${text('1.  Scan the code with your camera.', W / 2, 2720, { size: 78, fill: INK })}
  ${text('2.  Add it to your home screen — the app', W / 2, 2840, { size: 78, fill: INK })}
  ${text('shows you how on your phone.', W / 2, 2940, { size: 78, fill: INK })}
  ${text('Fill it in each day. Send it to your lifegroup leader every week.', W / 2, 3120, { size: 66, fill: ACCENT, weight: 600 })}
  ${text('JIL Austria', W / 2, 3320, { size: 58, fill: FAINT })}
</svg>`;
}

function bare() {
  const SIZE = 1200;
  const PAD = 60;
  const { path } = qrPath(SIZE - PAD * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>
  <g transform="translate(${PAD} ${PAD})"><path d="${path}" fill="#111111"/></g>
</svg>`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const targets = [
  ['devotion-qr.svg', bare(), 1200],
  ['devotion-qr-slide.svg', slide(), 1920],
  ['devotion-qr-poster.svg', poster(), 2480],
];

for (const [name, svg, width] of targets) {
  const svgPath = join(OUT, name);
  writeFileSync(svgPath, svg);
  const png = svgPath.replace(/\.svg$/, '.png');
  execFileSync('rsvg-convert', ['-w', String(width), '-o', png, svgPath]);
  console.log(png);
}

// The poster prints sharper from vector than from pixels, at any paper size.
const posterPdf = join(OUT, 'devotion-qr-poster.pdf');
execFileSync('rsvg-convert', [
  '-f', 'pdf', '-w', '2480', '-h', '3508',
  '-o', posterPdf, join(OUT, 'devotion-qr-poster.svg'),
]);
console.log(posterPdf);

console.log(`\nencodes: ${URL_TEXT}`);
