/**
 * End-to-end check of the address move (src/move.ts) in Chromium, WebKit and
 * Firefox. One build, two origins: 127.0.0.1 plays the old address, localhost
 * the new one.
 *
 *     VITE_MOVE_FROM=127.0.0.1 VITE_MOVE_TO=http://localhost:4174/jil-austria-devotion/ npx vite build
 *     npx vite preview --port 4174 --host 0.0.0.0     # in another shell
 *     node scripts/test-move.mjs
 */

// PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs picks a copy whose browsers are already downloaded.
const { chromium, firefox, webkit } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const PATH = '/jil-austria-devotion/';
const OLD = `http://127.0.0.1:4174${PATH}`;
const NEW = `http://localhost:4174${PATH}`;

const week = (monday, note, done = true) => JSON.stringify({
  monday,
  days: Array.from({ length: 7 }, (_, i) => ({ done: done && i < 5, text: note ? `John ${i + 1}:1-10` : '', note: note ? `${note} ${i}` : '' })),
});

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`);
  if (!ok) failures++;
}

async function seed(page, url, data) {
  await page.goto(url + 'favicon.svg'); // same origin, no app boot, no forwarding
  await page.evaluate((d) => { localStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v); }, data);
}

async function dump(page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
}

async function run(engine, label) {
  const browser = await engine.launch();
  const fresh = async () => { const ctx = await browser.newContext(); return [ctx, await ctx.newPage()]; };

  // 1. Basic move: profile + weeks + install flag arrive, link is tidied, app renders.
  {
    const [ctx, page] = await fresh();
    const old = {
      'devotion:profile': JSON.stringify({ name: 'Ana Cruz', lifegroup: 'VIA', church: 'JIL Austria', reminderTime: '06:00', reminderUid: 'u1', reminderSequence: 2 }),
      'devotion:week:2026-09-28': week('2026-09-28', 'Grace is enough — üöä ✝ 🙏'),
      'devotion:week:2026-10-05': week('2026-10-05', 'Second week'),
      'devotion:install-dismissed': '1',
      'unrelated': 'stays behind',
    };
    await seed(page, OLD, old);
    await page.goto(OLD);
    await page.waitForURL(NEW);
    await page.waitForFunction(() => document.querySelector('#app')?.children.length);
    const got = await dump(page);
    const want = Object.fromEntries(Object.entries(old).filter(([k]) => k.startsWith('devotion:')));
    check(`${label}: data moved`, JSON.stringify(got, Object.keys(want).sort()) === JSON.stringify(want, Object.keys(want).sort()) && !('unrelated' in got));
    check(`${label}: link tidied`, page.url() === NEW, page.url());
    await ctx.close();
  }

  // 2. Newer writing on the new site is never overwritten; empty weeks are filled.
  {
    const [ctx, page] = await fresh();
    await seed(page, NEW, {
      'devotion:profile': JSON.stringify({ name: 'Ana (new)' }),
      'devotion:week:2026-10-05': week('2026-10-05', 'Written on the new site'),
      'devotion:week:2026-09-28': week('2026-09-28', '', false),
    });
    await seed(page, OLD, {
      'devotion:profile': JSON.stringify({ name: 'Ana (old)' }),
      'devotion:week:2026-10-05': week('2026-10-05', 'Old copy'),
      'devotion:week:2026-09-28': week('2026-09-28', 'Only on the old site'),
    });
    await page.goto(OLD);
    await page.waitForURL(NEW);
    const got = await dump(page);
    check(`${label}: keeps new profile`, JSON.parse(got['devotion:profile']).name === 'Ana (new)');
    check(`${label}: keeps new week`, got['devotion:week:2026-10-05'].includes('Written on the new site'));
    check(`${label}: fills empty week`, got['devotion:week:2026-09-28'].includes('Only on the old site'));
    await ctx.close();
  }

  // 3. Nothing saved on the old site: still forwarded, no fragment.
  {
    const [ctx, page] = await fresh();
    await seed(page, OLD, {});
    await page.goto(OLD);
    await page.waitForURL(NEW);
    check(`${label}: empty old site forwards`, page.url() === NEW, page.url());
    await ctx.close();
  }

  // 4. Two years of long reflections still fit in the link.
  {
    const [ctx, page] = await fresh();
    const big = {};
    const long = 'Lord, teach me to wait on you and to trust you in the small things of each day. '.repeat(6);
    for (let i = 0; i < 104; i++) {
      const d = new Date(Date.UTC(2024, 9, 7 + i * 7)).toISOString().slice(0, 10);
      big[`devotion:week:${d}`] = week(d, `${long} #${i}`);
    }
    await seed(page, OLD, big);
    await page.goto(OLD);
    await page.waitForURL(NEW);
    const got = await dump(page);
    const n = Object.keys(got).filter((k) => k.startsWith('devotion:week:')).length;
    check(`${label}: 104 long weeks moved`, n === 104 && got[Object.keys(big)[103]] === big[Object.keys(big)[103]], `${n} weeks`);
    await ctx.close();
  }

  // 5. Browser without CompressionStream sends plain JSON; the new site reads it.
  {
    const [ctx, page] = await fresh();
    await page.addInitScript(() => { if (location.hostname === '127.0.0.1') delete globalThis.CompressionStream; });
    await seed(page, OLD, { 'devotion:week:2026-10-05': week('2026-10-05', 'No compression here') });
    let sawPlain = false;
    page.on('framenavigated', (f) => { if (f.url().includes('#move=j.')) sawPlain = true; });
    await page.goto(OLD);
    await page.waitForURL(NEW);
    const got = await dump(page);
    check(`${label}: plain fallback`, sawPlain && got['devotion:week:2026-10-05']?.includes('No compression here'));
    await ctx.close();
  }

  // 6. A cut-off link still opens the app, clean.
  {
    const [ctx, page] = await fresh();
    await page.goto(NEW + '#move=z.garbage!!');
    await page.waitForFunction(() => document.querySelector('#app')?.children.length);
    check(`${label}: garbled link opens app`, page.url() === NEW && (await dump(page))['devotion:profile'] === undefined, page.url());
    await ctx.close();
  }

  await browser.close();
}

for (const [engine, label] of [[chromium, 'chromium'], [webkit, 'webkit'], [firefox, 'firefox']]) {
  try { await run(engine, label); } catch (e) { failures++; console.log(`FAIL ${label}: ${e.message.split('\n')[0]}`); }
}
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
