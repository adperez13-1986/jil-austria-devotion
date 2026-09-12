/**
 * A tiny drawing surface, so the devotion sheet is laid out once and can be
 * rendered as a PDF or as an image without the two ever drifting apart.
 *
 * Coordinates are points measured from the top-left, and `y` for text is the
 * baseline.
 */

export type Font = 'helv' | 'helvBold' | 'times';

export type PageBox = { width: number; height: number };

export type Surface = {
  gray(value: number): void;
  rgb(r: number, g: number, b: number): void;
  lineWidth(value: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  rect(x: number, y: number, w: number, h: number, mode?: 'fill' | 'stroke'): void;
  circle(cx: number, cy: number, r: number, mode?: 'fill' | 'stroke'): void;
  polyline(points: Array<[number, number]>): void;
  text(value: string, x: number, y: number, font: Font, size: number, charSpacing?: number): void;
  textCentered(value: string, centerX: number, y: number, font: Font, size: number, charSpacing?: number): void;
  measure(value: string, font: Font, size: number, charSpacing?: number): number;
  wrap(value: string, font: Font, size: number, maxWidth: number, maxLines: number): string[];
};

export type Measurer = (value: string) => number;

/** Greedy word wrap. Long unbreakable words are split rather than overflowing. */
export function wrapWith(text: string, measure: Measurer, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';

  const flush = () => { if (line) { lines.push(line); line = ''; } };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) { line = candidate; continue; }
    flush();
    if (measure(word) <= maxWidth) { line = word; continue; }
    let chunk = '';
    for (const ch of word) {
      if (measure(chunk + ch) > maxWidth) {
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
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}
