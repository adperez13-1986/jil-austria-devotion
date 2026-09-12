/**
 * Regenerates the PWA icons in public/ from one SVG source.
 * Needs `rsvg-convert` (brew install librsvg). Icons are committed, so CI
 * never runs this — only re-run it when the mark changes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BG = '#2F5D50';
const FG = '#FBF9F5';

/** `inset` is the fraction of the canvas left clear around the mark. */
const mark = (size, inset) => {
  const c = size / 2;
  const r = size * (0.5 - inset);
  const stroke = size * 0.052;
  const s = r * 0.62;
  return `
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${FG}" stroke-width="${stroke}" stroke-opacity="0.55"/>
    <path d="M ${c - s * 0.62} ${c + s * 0.02} L ${c - s * 0.16} ${c + s * 0.48} L ${c + s * 0.66} ${c - s * 0.46}"
          fill="none" stroke="${FG}" stroke-width="${stroke * 1.35}" stroke-linecap="round" stroke-linejoin="round"/>
  `;
};

const rounded = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2235}" fill="${BG}"/>
  ${mark(size, 0.29)}
</svg>`;

const bleed = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  ${mark(size, 0.34)}
</svg>`;

const targets = [
  ['icon-192.png', rounded(192), 192],
  ['icon-512.png', rounded(512), 512],
  ['icon-maskable-512.png', bleed(512), 512],
  ['apple-touch-icon.png', bleed(180), 180],
];

const work = mkdtempSync(join(tmpdir(), 'devotion-icons-'));
for (const [name, svg, size] of targets) {
  const src = join(work, `${name}.svg`);
  writeFileSync(src, svg);
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', join('public', name), src]);
  console.log(`public/${name}`);
}

writeFileSync('public/favicon.svg', rounded(64));
console.log('public/favicon.svg');
