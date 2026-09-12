import type { Week, Profile } from './store.ts';
import { weekAsPdf, weekAsText, pdfFilename } from './sheet.ts';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Hand the week to the phone's share sheet as a PDF so it can go straight to
 * the lifegroup leader. Desktop browsers mostly can't share files — they get
 * the download instead.
 */
export async function sharePdf(week: Week, profile: Profile): Promise<ShareResult> {
  const blob = weekAsPdf(week, profile);
  const filename = pdfFilename(week, profile);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else (permission, unsupported target) falls through to a download.
    }
  }

  download(blob, filename);
  return 'downloaded';
}

export function downloadPdf(week: Week, profile: Profile): void {
  download(weekAsPdf(week, profile), pdfFilename(week, profile));
}

export async function copyText(week: Week, profile: Profile): Promise<boolean> {
  const text = weekAsText(week, profile);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Safari refuses clipboard writes outside a direct gesture in some modes.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export async function shareText(week: Week, profile: Profile): Promise<ShareResult> {
  const text = weekAsText(week, profile);
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyText(week, profile)) ? 'downloaded' : 'cancelled';
}
