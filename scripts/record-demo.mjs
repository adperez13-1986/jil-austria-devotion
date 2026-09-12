/**
 * Records the explainer video by driving the real app in a phone-sized browser.
 *
 * Not part of the build. Run it when the UI changes and the video needs redoing:
 *
 *     npm i -D --no-save playwright
 *     npm run dev -- --port 5200        # in another shell
 *     node scripts/record-demo.mjs
 *
 * Output lands in demo/: a .webm from Playwright and an .mp4 converted with
 * ffmpeg, which is the one to actually send anywhere.
 *
 * It records the browser, so it covers everything that happens inside the app.
 * Adding to the home screen, the iOS share sheet and Calendar are operating
 * system screens — no browser can record those, and they still need a screen
 * recording from a real phone.
 */

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const APP = process.env.DEMO_URL ?? 'http://localhost:5200/jil-austria-devotion/';
const OUT = 'demo';
const RAW = join(OUT, 'raw');

const PHONE = { width: 390, height: 844 };
/**
 * Playwright drops the page picture into the video canvas unscaled, so asking
 * for anything larger than the viewport just pads the frame with grey. Record
 * at viewport size and let ffmpeg do the upscaling.
 */
const VIDEO = PHONE;
const UPSCALE = 2;

/** The week the demo fills in, so the finished sheet has something to show. */
const SCRIPTED_DAYS = [
  { text: 'Psalm 23', note: 'He makes me lie down. Rest is something He gives.' },
  { text: 'John 15:1-11', note: 'Abiding is not striving.' },
  { text: 'Romans 8:31-39', note: 'Nothing separates.' },
];

function setUp() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });
}

/**
 * Runs before the app's own scripts, on every navigation: adds the caption bar
 * and the circle that marks each tap, neither of which the app knows about.
 */
function overlay() {
  try {
    localStorage.setItem('devotion:install-dismissed', '1');
  } catch {
    // Nothing to do — the banner just shows up in the video.
  }

  const boot = () => {
    if (document.getElementById('demo-caption')) return;

    const style = document.createElement('style');
    style.textContent = `
      body { padding-top: 78px !important; }
      .appbar { top: 78px !important; }
      #demo-caption {
        position: fixed; inset: 0 0 auto 0; height: 78px; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 0 22px; text-align: center;
        background: #1b1a15; color: #fff;
        font: 600 17px/1.25 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        opacity: 0; transition: opacity .3s ease;
      }
      #demo-caption.on { opacity: 1; }
      /* Leave the caption undimmed when a sheet opens over the app. */
      dialog::backdrop {
        background: linear-gradient(to bottom, transparent 0 78px, rgba(20,18,14,.45) 78px) !important;
      }
      .demo-tap {
        position: fixed; z-index: 9998; width: 46px; height: 46px; margin: -23px 0 0 -23px;
        border-radius: 50%; border: 2.5px solid rgba(47,93,80,.95); background: rgba(47,93,80,.28);
        pointer-events: none; animation: demo-tap .65s ease-out forwards;
      }
      @keyframes demo-tap {
        from { transform: scale(.35); opacity: 1; }
        to   { transform: scale(1.3);  opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'demo-caption';
    document.body.appendChild(bar);

    window.__caption = (text) => {
      if (!text) { bar.classList.remove('on'); return; }
      bar.textContent = text;
      bar.classList.add('on');
    };

    addEventListener('pointerdown', (event) => {
      const dot = document.createElement('div');
      dot.className = 'demo-tap';
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 700);
    }, true);
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
}

async function record() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: RAW, size: VIDEO },
  });

  await context.addInitScript(overlay);
  const page = await context.newPage();

  const say = (text) => page.evaluate((t) => window.__caption(t), text);
  const beat = (ms) => page.waitForTimeout(ms);
  const type = async (locator, text) => {
    await locator.tap();
    await locator.pressSequentially(text, { delay: 42 });
  };

  await page.goto(APP);
  await page.waitForSelector('.day');
  await beat(700);

  await say('Your devotion checklist, on your phone');
  await beat(2400);

  await say('Tap the gear to set up — just once');
  await beat(1100);
  await page.locator('#open-settings').tap();
  await beat(1000);

  await say('Your name, and your lifegroup leader');
  await type(page.locator('#f-name'), 'Adrian Perez');
  await beat(300);
  await type(page.locator('#f-group'), 'Ptr. Dan');
  await beat(1100);

  await say('Pick a time for your daily reminder');
  await beat(900);
  await page.locator('#f-time').fill('06:00');
  await beat(700);
  await page.locator('#do-reminder').tap();
  await beat(1300);

  await say('Your phone reminds you, even when the app is closed');
  await beat(2400);

  await page.locator('#settings-sheet .close').tap();
  await beat(900);

  await say('Each day: tick it, and note what you read');
  await beat(1200);

  const days = page.locator('.day');
  for (const [index, day] of SCRIPTED_DAYS.entries()) {
    const card = days.nth(index);
    await card.locator('.tick').tap();
    await beat(350);
    await type(card.locator('.text'), day.text);
    await beat(200);
    await type(card.locator('.note'), day.note);
    await beat(index === 0 ? 1200 : 500);

    if (index === 0) {
      await say('It saves by itself — there is no save button');
      await beat(2300);
      await say(null);
      await beat(400);
    }
  }

  await beat(900);
  await say('At the end of the week, send it to your leader');
  await beat(1800);
  await page.locator('#more').tap();
  await beat(1400);

  await say('An image shows up right inside the chat');
  await beat(2600);

  await page.locator('#close-share').tap();
  await beat(600);

  await say('This is what your leader receives');
  await page.evaluate(async () => {
    // Resolved against the page so it follows Vite's base path.
    const { weekAsPng } = await import(new URL('src/sheet.ts', location.href).href);
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const pad = (v) => String(v).padStart(2, '0');
    const key = `devotion:week:${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

    const blob = await weekAsPng(
      JSON.parse(localStorage.getItem(key)),
      JSON.parse(localStorage.getItem('devotion:profile')),
    );

    document.querySelector('#app').style.display = 'none';
    document.body.style.background = '#d9d5cb';

    const frame = document.createElement('div');
    frame.style.cssText =
      'position:fixed;inset:78px 0 0 0;display:flex;align-items:center;justify-content:center;padding:18px;';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.style.cssText =
      'max-width:100%;max-height:100%;box-shadow:0 8px 34px rgba(0,0,0,.28);border-radius:3px;';
    frame.appendChild(img);
    document.body.appendChild(frame);
    await img.decode();
  });
  await beat(4000);

  await say('Open it every day. Show up — that is enough.');
  await beat(2600);

  await context.close();
  await browser.close();
}

function finish() {
  const raw = readdirSync(RAW).find((f) => f.endsWith('.webm'));
  if (!raw) throw new Error('Playwright produced no video');

  const webm = join(OUT, 'devotion-demo.webm');
  renameSync(join(RAW, raw), webm);
  rmSync(RAW, { recursive: true, force: true });

  const mp4 = join(OUT, 'devotion-demo.mp4');
  // yuv420p and the even-dimension scale keep it playable on phones and in
  // Messenger, which reject anything more exotic.
  execFileSync('ffmpeg', [
    '-y', '-i', webm,
    '-vf', `scale=iw*${UPSCALE}:ih*${UPSCALE}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    mp4,
  ], { stdio: 'ignore' });

  return { webm, mp4 };
}

setUp();
await record();
const files = finish();
console.log(`${files.webm}\n${files.mp4}`);
