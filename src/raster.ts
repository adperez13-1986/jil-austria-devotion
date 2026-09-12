/**
 * The same devotion sheet, drawn to a canvas and handed back as a PNG.
 *
 * Chat apps preview an image inline, so a leader collecting a dozen sheets on a
 * Sunday reads them in the thread instead of opening a dozen attachments.
 */

import { wrapWith } from './surface.ts';
import type { Font, PageBox, Surface } from './surface.ts';

/** Enough that the text stays sharp when someone taps to zoom. */
const SCALE = 3;

const FONT_CSS: Record<Font, (size: number) => string> = {
  helv: (size) => `${size}px Helvetica, Arial, sans-serif`,
  helvBold: (size) => `bold ${size}px Helvetica, Arial, sans-serif`,
  times: (size) => `${size}px "Times New Roman", Times, serif`,
};

function createSurface(ctx: CanvasRenderingContext2D): Surface {
  const use = (font: Font, size: number) => { ctx.font = FONT_CSS[font](size); };

  const measure = (value: string, font: Font, size: number, charSpacing = 0): number => {
    use(font, size);
    return ctx.measureText(value).width + charSpacing * [...value].length;
  };

  const text = (
    value: string, x: number, y: number, font: Font, size: number, charSpacing = 0,
  ): void => {
    if (!value) return;
    use(font, size);
    if (!charSpacing) {
      ctx.fillText(value, x, y);
      return;
    }
    // Drawn per character rather than via ctx.letterSpacing, which older
    // Safari does not have.
    let cursor = x;
    for (const ch of value) {
      ctx.fillText(ch, cursor, y);
      cursor += ctx.measureText(ch).width + charSpacing;
    }
  };

  return {
    gray(value) {
      const channel = Math.round(value * 255);
      ctx.fillStyle = `rgb(${channel} ${channel} ${channel})`;
      ctx.strokeStyle = ctx.fillStyle;
    },
    rgb(r, g, b) {
      ctx.fillStyle = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
      ctx.strokeStyle = ctx.fillStyle;
    },
    lineWidth(value) { ctx.lineWidth = value; },
    line(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
    rect(x, y, w, h, mode = 'fill') {
      if (mode === 'fill') ctx.fillRect(x, y, w, h);
      else ctx.strokeRect(x, y, w, h);
    },
    circle(cx, cy, r, mode = 'stroke') {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (mode === 'fill') ctx.fill();
      else ctx.stroke();
    },
    polyline(points) {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
    },
    text,
    textCentered(value, centerX, y, font, size, charSpacing = 0) {
      text(value, centerX - measure(value, font, size, charSpacing) / 2, y, font, size, charSpacing);
    },
    measure,
    wrap(value, font, size, maxWidth, maxLines) {
      return wrapWith(value, (v) => measure(v, font, size), maxWidth, maxLines);
    },
  };
}

export function renderPng(
  page: PageBox,
  draw: (surface: Surface, page: PageBox) => void,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(page.width * SCALE);
  canvas.height = Math.round(page.height * SCALE);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable on this device');

  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // The PDF sits on white paper; an image has to bring its own.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, page.width, page.height);

  draw(createSurface(ctx), page);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the image'))),
      'image/png',
    );
  });
}
