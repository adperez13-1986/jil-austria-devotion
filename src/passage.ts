/**
 * The link out to the passage, and the nudge when a reference can't be real.
 *
 * The app never carries the words of the verse. Translations are copyrighted
 * and a shared sheet would republish them into a dozen chats, so the sheet
 * carries the reference and this sends the reader to their own Bible.
 */

import { parseReference, passageUrl, referenceProblem } from './books.ts';

const OPEN_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
  '<path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';

/**
 * Wire a Bible-text field up to its passage.
 *
 * Shows a small open-in-browser button once the reference names a book, and a
 * quiet line underneath when the chapter can't exist.
 */
export function attachPassageLink(input: HTMLInputElement): void {
  const link = document.createElement('a');
  link.className = 'open';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = OPEN_ICON;
  link.hidden = true;

  const warning = document.createElement('p');
  warning.className = 'warn';
  warning.hidden = true;

  input.insertAdjacentElement('afterend', link);
  link.insertAdjacentElement('afterend', warning);

  function update(): void {
    const reference = parseReference(input.value);
    const problem = reference && referenceProblem(reference);

    if (reference && !problem) {
      link.href = passageUrl(reference);
      link.setAttribute('aria-label', `Read ${reference.query} in a new tab`);
      link.hidden = false;
    } else {
      link.removeAttribute('href');
      link.hidden = true;
    }

    warning.textContent = problem ?? '';
    warning.hidden = !problem;
  }

  input.addEventListener('input', update);
  update();
}
