/**
 * A very small PDF writer.
 *
 * Only what this app needs: lines, filled rectangles, circles and text in the
 * two standard fonts every reader has built in (Helvetica, Times-Roman). No
 * font embedding, no compression, no dependencies — which means the whole
 * thing keeps working inside the service worker cache with the phone offline.
 *
 * Text is encoded as WinAnsi, so Latin characters are fine and anything
 * outside that set degrades to "?" rather than corrupting the file.
 */

// Advance widths per 1000 units, for character codes 32..126.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667,
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556,
  556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];

const TIMES_WIDTHS = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
  278, 278, 564, 564, 564, 444, 921,
  722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556,
  722, 667, 556, 611, 722, 722, 944, 722, 722, 611,
  333, 278, 333, 469, 500, 333,
  444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500,
  500, 333, 389, 278, 500, 500, 722, 500, 500, 444,
  480, 200, 480, 541,
];

export type Font = 'helv' | 'helvBold' | 'times';

const FONT_RES: Record<Font, string> = { helv: '/F1', helvBold: '/F2', times: '/F3' };

function widthTable(font: Font): number[] {
  return font === 'times' ? TIMES_WIDTHS : HELVETICA_WIDTHS;
}

/** Helvetica-Bold runs a little wider than Helvetica; close enough for labels. */
function boldFactor(font: Font): number {
  return font === 'helvBold' ? 1.07 : 1;
}

/** Map a Unicode string onto WinAnsi byte values. */
function toWinAnsi(text: string): number[] {
  const special: Record<string, number> = {
    '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94,
    '–': 0x96, '—': 0x97, '…': 0x85, '•': 0x95,
    '‹': 0x8b, '›': 0x9b, '€': 0x80, '™': 0x99,
  };
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if (code === 9) out.push(32);
    else if (code >= 32 && code <= 126) out.push(code);
    else if (special[ch] !== undefined) out.push(special[ch]);
    else if (code >= 160 && code <= 255) out.push(code);
    else out.push(63); // "?"
  }
  return out;
}

export function measure(text: string, font: Font, size: number, charSpacing = 0): number {
  const table = widthTable(font);
  const factor = boldFactor(font);
  let total = 0;
  for (const byte of toWinAnsi(text)) {
    const w = byte >= 32 && byte <= 126 ? table[byte - 32] : table[33 - 32];
    total += (w * factor * size) / 1000 + charSpacing;
  }
  return total;
}

/** Greedy word wrap. Long unbreakable words are hard-split rather than overflowing. */
export function wrap(text: string, font: Font, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';

  const flush = () => { if (line) { lines.push(line); line = ''; } };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, font, size) <= maxWidth) { line = candidate; continue; }
    flush();
    if (measure(word, font, size) <= maxWidth) { line = word; continue; }
    let chunk = '';
    for (const ch of word) {
      if (measure(chunk + ch, font, size) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
        if (lines.length >= maxLines) break;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  flush();

  if (lines.length > maxLines) {
    lines.length = maxLines;
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

function escapeString(text: string): string {
  let out = '';
  for (const byte of toWinAnsi(text)) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += '\\' + String.fromCharCode(byte);
    else if (byte < 32 || byte > 126) out += '\\' + byte.toString(8).padStart(3, '0');
    else out += String.fromCharCode(byte);
  }
  return out;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;

function n(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/**
 * Drawing surface. All y coordinates are measured DOWN from the top of the
 * page, because that is how the layout below reads; the flip to PDF's
 * bottom-left origin happens here and nowhere else.
 */
export type Canvas = {
  ops: string[];
  gray(value: number): void;
  rgb(r: number, g: number, b: number): void;
  lineWidth(value: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  rect(x: number, y: number, w: number, h: number, mode?: 'fill' | 'stroke'): void;
  circle(cx: number, cy: number, r: number, mode?: 'fill' | 'stroke'): void;
  polyline(points: Array<[number, number]>): void;
  text(value: string, x: number, y: number, font: Font, size: number, charSpacing?: number): void;
  textCentered(value: string, centerX: number, y: number, font: Font, size: number, charSpacing?: number): void;
};

function createCanvas(): Canvas {
  const ops: string[] = [];
  const Y = (y: number) => PAGE_H - y;

  const text = (value: string, x: number, y: number, font: Font, size: number, charSpacing = 0) => {
    if (!value) return;
    ops.push(
      'BT',
      `${FONT_RES[font]} ${n(size)} Tf`,
      `${n(charSpacing)} Tc`,
      `${n(x)} ${n(Y(y))} Td`,
      `(${escapeString(value)}) Tj`,
      'ET',
    );
  };

  return {
    ops,
    gray(value) { ops.push(`${n(value)} g`, `${n(value)} G`); },
    rgb(r, g, b) { ops.push(`${n(r)} ${n(g)} ${n(b)} rg`, `${n(r)} ${n(g)} ${n(b)} RG`); },
    lineWidth(value) { ops.push(`${n(value)} w`); },
    line(x1, y1, x2, y2) { ops.push(`${n(x1)} ${n(Y(y1))} m ${n(x2)} ${n(Y(y2))} l S`); },
    rect(x, y, w, h, mode = 'fill') {
      ops.push(`${n(x)} ${n(Y(y + h))} ${n(w)} ${n(h)} re ${mode === 'fill' ? 'f' : 'S'}`);
    },
    circle(cx, cy, r, mode = 'stroke') {
      const k = 0.5523 * r;
      const y = Y(cy);
      ops.push(
        `${n(cx + r)} ${n(y)} m`,
        `${n(cx + r)} ${n(y + k)} ${n(cx + k)} ${n(y + r)} ${n(cx)} ${n(y + r)} c`,
        `${n(cx - k)} ${n(y + r)} ${n(cx - r)} ${n(y + k)} ${n(cx - r)} ${n(y)} c`,
        `${n(cx - r)} ${n(y - k)} ${n(cx - k)} ${n(y - r)} ${n(cx)} ${n(y - r)} c`,
        `${n(cx + k)} ${n(y - r)} ${n(cx + r)} ${n(y - k)} ${n(cx + r)} ${n(y)} c`,
        mode === 'fill' ? 'f' : 'S',
      );
    },
    polyline(points) {
      if (points.length < 2) return;
      const [first, ...rest] = points;
      ops.push(`${n(first[0])} ${n(Y(first[1]))} m`);
      for (const [x, y] of rest) ops.push(`${n(x)} ${n(Y(y))} l`);
      ops.push('S');
    },
    text,
    textCentered(value, centerX, y, font, size, charSpacing = 0) {
      const w = measure(value, font, size, charSpacing);
      text(value, centerX - w / 2, y, font, size, charSpacing);
    },
  };
}

function pdfDate(date: Date): string {
  const p = (v: number) => String(v).padStart(2, '0');
  const tz = -date.getTimezoneOffset();
  const sign = tz >= 0 ? '+' : '-';
  const abs = Math.abs(tz);
  return `D:${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}` +
    `${sign}${p(Math.floor(abs / 60))}'${p(abs % 60)}'`;
}

/** Assemble a one-page document from a drawing callback. */
export function renderPdf(title: string, draw: (canvas: Canvas, page: { width: number; height: number }) => void): Blob {
  const canvas = createCanvas();
  draw(canvas, { width: PAGE_W, height: PAGE_H });
  const content = canvas.ops.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PAGE_W)} ${n(PAGE_H)}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
    `<< /Title (${escapeString(title)}) /Producer (Soledad Devotion) /CreationDate (${pdfDate(new Date())}) >>`,
  ];

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n`;
  out += `startxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}
