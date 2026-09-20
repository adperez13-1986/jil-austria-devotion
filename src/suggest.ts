/**
 * The dropdown under a Bible-text field.
 *
 * Typing "1cor" offers 1 Corinthians; picking it writes the full name and
 * leaves the cursor ready for the chapter. Tap targets are sized for a thumb,
 * since almost everyone fills this in on a phone.
 */

import { splitReference, suggestBooks } from './books.ts';

let widgetCount = 0;

/** Bold the part of the name the typing already matched. */
function label(name: string, typed: string): string {
  const at = typed ? name.toLowerCase().indexOf(typed.toLowerCase()) : -1;
  if (at < 0) return name;
  const end = at + typed.length;
  return `${name.slice(0, at)}<b>${name.slice(at, end)}</b>${name.slice(end)}`;
}

/**
 * Wire suggestions onto a text input.
 *
 * Attach this before any other keydown listener on the same input: when the
 * list is open it takes Enter and Escape for itself, and it stops the event
 * there so a listener behind it doesn't also act on the same key.
 */
export function attachBookSuggest(input: HTMLInputElement): void {
  const id = `books-${++widgetCount}`;
  const list = document.createElement('ul');
  list.className = 'options';
  list.id = id;
  list.role = 'listbox';
  list.hidden = true;
  input.insertAdjacentElement('afterend', list);

  input.role = 'combobox';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', id);
  input.setAttribute('aria-expanded', 'false');

  let options: string[] = [];
  let active = -1;

  function close(): void {
    if (list.hidden) return;
    list.hidden = true;
    list.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    options = [];
    active = -1;
  }

  function highlight(): void {
    [...list.children].forEach((item, i) => {
      item.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) input.setAttribute('aria-activedescendant', `${id}-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function open(): void {
    const { book } = splitReference(input.value);
    options = suggestBooks(book);
    if (!options.length) { close(); return; }

    list.textContent = '';
    options.forEach((name, i) => {
      const item = document.createElement('li');
      item.id = `${id}-${i}`;
      item.role = 'option';
      item.innerHTML = label(name, book);
      item.addEventListener('click', () => pick(name));
      list.appendChild(item);
    });

    list.hidden = false;
    flip();
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    highlight();
  }

  /**
   * Drop the list above the field when there's no room under it. On a phone
   * the on-screen keyboard takes the bottom half of the screen, which is
   * exactly where the last day of the week sits.
   */
  function flip(): void {
    list.classList.remove('above');
    const view = window.visualViewport;
    const floor = view ? view.offsetTop + view.height : window.innerHeight;
    const below = list.getBoundingClientRect();
    const field = input.getBoundingClientRect();
    if (below.bottom > floor - 8 && field.top - below.height > 8) list.classList.add('above');
  }

  function pick(name: string): void {
    const { rest } = splitReference(input.value);
    input.value = rest ? `${name} ${rest}` : `${name} `;
    close();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    // Lets whoever owns the field save the change the same way as typing.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function move(step: number): void {
    if (!options.length) return;
    active = (active + step + options.length) % options.length;
    highlight();
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', open);
  input.addEventListener('focus', open);
  input.addEventListener('blur', close);

  input.addEventListener('keydown', (event) => {
    if (list.hidden) {
      if (event.key === 'ArrowDown') open();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pick(options[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  });

  // Keeps the field focused when a suggestion is tapped, so the tap lands as a
  // click instead of blurring the input out from under it.
  list.addEventListener('pointerdown', (event) => event.preventDefault());
}
