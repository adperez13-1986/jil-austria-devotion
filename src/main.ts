import './style.css';
import { DAY_NAMES, datesOf, isFuture, isToday, shortDate, shiftWeek, thisMonday, weekLabel } from './week.ts';
import { completed, loadProfile, loadWeek, saveProfile, saveWeek } from './store.ts';
import type { Profile, Week } from './store.ts';
import { copyText, downloadPdf, sharePdf, shareText } from './share.ts';

const ICON = {
  check: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  gear: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  copy: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  download: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  chat: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.7-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg>',
};

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <header class="appbar">
    <span class="brand">Devotion</span>
    <button class="icon-btn" id="open-settings" aria-label="Settings">${ICON.gear}</button>
  </header>

  <nav class="weeknav">
    <button class="arrow" id="prev-week" aria-label="Previous week">&lsaquo;</button>
    <button class="label" id="this-week">
      <strong id="week-label"></strong>
      <span id="week-count"></span>
    </button>
    <button class="arrow" id="next-week" aria-label="Next week">&rsaquo;</button>
  </nav>

  <div id="install-slot"></div>
  <main class="days" id="days"></main>

  <div class="bar">
    <div class="inner">
      <button class="btn" id="share">Share this week</button>
      <button class="btn secondary" id="more" aria-label="More ways to share">${ICON.dots}</button>
    </div>
  </div>

  <dialog id="settings-sheet">
    <form method="dialog" class="sheet">
      <h2>Your details</h2>
      <p class="hint">These go on top of every sheet you share. Everything you write stays on this phone.</p>
      <div class="field"><label for="f-name">Name</label><input id="f-name" autocomplete="name" /></div>
      <div class="field"><label for="f-group">Lifegroup</label><input id="f-group" placeholder="Your leader's name" /></div>
      <div class="field"><label for="f-church">Church</label><input id="f-church" /></div>
      <button class="close" value="close">Done</button>
    </form>
  </dialog>

  <dialog id="share-sheet">
    <div class="sheet">
      <h2>Share this week</h2>
      <p class="hint" id="share-week-label"></p>
      <div class="menu">
        <button id="do-pdf">${ICON.download}<span>Download PDF<small>Save the sheet to this device</small></span></button>
        <button id="do-text">${ICON.chat}<span>Send as a message<small>Plain text for Messenger or Viber</small></span></button>
        <button id="do-copy">${ICON.copy}<span>Copy as text<small>Paste it anywhere</small></span></button>
      </div>
      <button class="close" id="close-share">Cancel</button>
    </div>
  </dialog>

  <div class="toast" id="toast"></div>
`;

const daysEl = app.querySelector<HTMLElement>('#days')!;
const weekLabelEl = app.querySelector<HTMLElement>('#week-label')!;
const weekCountEl = app.querySelector<HTMLElement>('#week-count')!;
const nextBtn = app.querySelector<HTMLButtonElement>('#next-week')!;
const toastEl = app.querySelector<HTMLElement>('#toast')!;
const settingsSheet = app.querySelector<HTMLDialogElement>('#settings-sheet')!;
const shareSheet = app.querySelector<HTMLDialogElement>('#share-sheet')!;

let profile: Profile = loadProfile();
let monday = thisMonday();
let week: Week = loadWeek(monday);
let saveTimer: number | undefined;

function queueSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveWeek(week), 400);
}

function flushSave(): void {
  window.clearTimeout(saveTimer);
  saveWeek(week);
}

let toastTimer: number | undefined;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function autosize(area: HTMLTextAreaElement): void {
  area.style.height = 'auto';
  area.style.height = `${area.scrollHeight}px`;
}

function updateCount(): void {
  const done = completed(week);
  const suffix = monday === thisMonday() ? ' · this week' : '';
  weekCountEl.textContent = `${done} of 7 days${suffix}`;
}

function renderWeek(): void {
  weekLabelEl.textContent = weekLabel(monday);
  updateCount();
  nextBtn.disabled = monday >= thisMonday();

  const dates = datesOf(monday);
  daysEl.textContent = '';

  DAY_NAMES.forEach((dayName, i) => {
    const day = week.days[i];
    const date = dates[i];

    const card = document.createElement('article');
    card.className = 'day';
    card.classList.toggle('done', day.done);
    card.classList.toggle('today', isToday(date));
    card.classList.toggle('future', isFuture(date));
    card.innerHTML = `
      <button class="tick" aria-label="Mark ${dayName} done">${ICON.check}</button>
      <div class="body">
        <div class="head">
          <span class="name">${dayName}</span>
          <span class="date">${shortDate(date)}</span>
          ${isToday(date) ? '<span class="pill">Today</span>' : ''}
        </div>
        <input class="text" type="text" placeholder="Bible text" enterkeyhint="next" />
        <textarea class="note" rows="1" placeholder="Short reflection"></textarea>
      </div>
    `;

    const tick = card.querySelector<HTMLButtonElement>('.tick')!;
    const text = card.querySelector<HTMLInputElement>('.text')!;
    const note = card.querySelector<HTMLTextAreaElement>('.note')!;

    text.value = day.text;
    note.value = day.note;
    tick.setAttribute('aria-pressed', String(day.done));

    tick.addEventListener('click', () => {
      day.done = !day.done;
      card.classList.toggle('done', day.done);
      tick.setAttribute('aria-pressed', String(day.done));
      updateCount();
      flushSave();
    });

    text.addEventListener('input', () => { day.text = text.value; queueSave(); });
    text.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); note.focus(); }
    });
    note.addEventListener('input', () => { day.note = note.value; autosize(note); queueSave(); });

    daysEl.appendChild(card);
    autosize(note);
  });
}

function goToWeek(key: string): void {
  flushSave();
  monday = key;
  week = loadWeek(monday);
  renderWeek();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

app.querySelector('#prev-week')!.addEventListener('click', () => goToWeek(shiftWeek(monday, -1)));
nextBtn.addEventListener('click', () => {
  if (monday < thisMonday()) goToWeek(shiftWeek(monday, 1));
});
app.querySelector('#this-week')!.addEventListener('click', () => {
  if (monday !== thisMonday()) goToWeek(thisMonday());
});

/* ---------- settings ---------- */

const nameInput = app.querySelector<HTMLInputElement>('#f-name')!;
const groupInput = app.querySelector<HTMLInputElement>('#f-group')!;
const churchInput = app.querySelector<HTMLInputElement>('#f-church')!;

app.querySelector('#open-settings')!.addEventListener('click', () => {
  nameInput.value = profile.name;
  groupInput.value = profile.lifegroup;
  churchInput.value = profile.church;
  settingsSheet.showModal();
});

settingsSheet.addEventListener('close', () => {
  profile = {
    name: nameInput.value.trim(),
    lifegroup: groupInput.value.trim(),
    church: churchInput.value.trim(),
  };
  saveProfile(profile);
});

/* ---------- sharing ---------- */

app.querySelector('#share')!.addEventListener('click', async () => {
  flushSave();
  if (!profile.name) {
    toast('Add your name in settings first');
    settingsSheet.showModal();
    return;
  }
  const result = await sharePdf(week, profile);
  if (result === 'downloaded') toast('PDF saved to your device');
});

app.querySelector('#more')!.addEventListener('click', () => {
  flushSave();
  app.querySelector<HTMLElement>('#share-week-label')!.textContent = weekLabel(monday);
  shareSheet.showModal();
});

app.querySelector('#close-share')!.addEventListener('click', () => shareSheet.close());
shareSheet.addEventListener('click', (event) => {
  if (event.target === shareSheet) shareSheet.close();
});

app.querySelector('#do-pdf')!.addEventListener('click', () => {
  shareSheet.close();
  downloadPdf(week, profile);
  toast('PDF saved to your device');
});

app.querySelector('#do-text')!.addEventListener('click', async () => {
  shareSheet.close();
  const result = await shareText(week, profile);
  if (result === 'downloaded') toast('Copied — paste it in your chat');
});

app.querySelector('#do-copy')!.addEventListener('click', async () => {
  shareSheet.close();
  toast((await copyText(week, profile)) ? 'Copied to clipboard' : 'Could not copy');
});

/* ---------- install hint ---------- */

const INSTALL_DISMISSED = 'devotion:install-dismissed';

function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

function showInstallHint(message: string, action?: { label: string; run: () => void }): void {
  if (isInstalled() || localStorage.getItem(INSTALL_DISMISSED)) return;
  const slot = app.querySelector<HTMLElement>('#install-slot')!;
  const hint = document.createElement('div');
  hint.className = 'install';
  hint.innerHTML = `<span>${message}</span><button type="button">${action ? action.label : 'Got it'}</button>`;
  hint.querySelector('button')!.addEventListener('click', () => {
    if (action) action.run();
    localStorage.setItem(INSTALL_DISMISSED, '1');
    hint.remove();
  });
  slot.replaceChildren(hint);
}

type InstallPrompt = Event & { prompt: () => Promise<void> };

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  const deferred = event as InstallPrompt;
  showInstallHint('Add Devotion to your home screen.', {
    label: 'Install',
    run: () => void deferred.prompt(),
  });
});

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isIOS) {
  showInstallHint('Tap Share, then “Add to Home Screen”.');
}

/* ---------- boot ---------- */

renderWeek();
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  });
}
