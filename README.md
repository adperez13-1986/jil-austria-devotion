# Devotion

A weekly devotion checklist for Soledad members — the paper form, on a phone.
Fill it in through the week, then share the week to your lifegroup leader as a
PDF or as a chat message.

Installable as a PWA, so it sits on the home screen and opens like a native app.

## How a member uses it

1. Open the link, tap **Add to Home Screen** (iOS) or **Install** (Android).
2. Tap the gear once to enter name and lifegroup. That is the whole setup.
3. Each day: tick the circle, type the Bible text, type a short reflection.
   Everything saves as you type.
4. End of the week: **Share this week** → the phone's share sheet opens with a
   PDF attached. Send it to the leader in whatever app they already use.

The `…` button next to Share offers three alternatives:

- **Send as an image** — a PNG of the same sheet. Chat apps preview it inline,
  so a leader collecting a dozen on a Sunday reads them in the thread instead of
  opening a dozen attachments. Usually the best choice for Messenger and WhatsApp.
- **Download PDF** — save it to the device.
- **Send as a message** — the week as plain text, for pasting into any chat.

Any past week can be shared — use the arrows to move back, then Share.

## Daily reminders

Settings has a time picker and an **Add to calendar** button. It hands the phone
a repeating calendar event with an alarm, so the reminder fires on a locked
screen at the chosen time, every day, on both iPhone and Android.

It is a calendar event rather than a push notification on purpose. Browsers have
no API for scheduling a notification for later — the page would have to be open,
or a push server would have to wake it. A push server means a backend and a
monthly bill, and this app is meant to cost nothing to run. A calendar alarm does
the same job for free and works identically on both platforms.

Changing the time and tapping again updates the existing event rather than adding
a second one: the event keeps a stable `UID` stored in the profile, and each
re-add bumps its `SEQUENCE`. Removing the reminder is done in the calendar app.

## Where the data lives

In the browser's `localStorage`, on the member's own phone. There is no account,
no server and no database. Nothing leaves the device until they tap Share.

That is deliberate: reflections are private, and a church app that collects them
centrally is a responsibility nobody asked for. The trade-offs to know about:

- Clearing site data, or deleting the app on iOS, deletes the entries.
- Entries do not follow a member to a second device.
- A leader collecting the sheets is the only copy that leaves the phone.

If those become a problem, the storage layer is one file (`src/store.ts`) and can
be pointed at a backend without touching the rest.

## Development

    npm install
    npm run dev        # local dev server
    npm run build      # type-check + build into dist/
    npm run preview    # serve the built output

Deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.
The repo name must stay `soledad-devotion`, or `base` in `vite.config.ts` and the
absolute paths in `index.html` need to change with it.

### The QR code

`qr/` holds what the app gets introduced with:

| File | For |
| --- | --- |
| `devotion-qr-slide.png` | 1920x1080, to project during an announcement |
| `devotion-qr-poster.pdf` | A4, to print and pin up — vector, so it scales to any paper |
| `devotion-qr-poster.png` | The same poster as pixels |
| `devotion-qr.png` / `.svg` | The bare code, for pasting into anything else |

Regenerate after a URL change:

    npm i -D --no-save qrcode
    node scripts/make-qr.mjs

Every output is checked to decode back to the exact URL, including heavily
downscaled, before being committed — a QR that does not scan is worse than no
QR at all.

### The explainer video

`demo/devotion-demo.mp4` is recorded by driving the real app in a phone-sized
browser, with captions and tap circles drawn over it. To redo it after a UI
change:

    npm i -D --no-save playwright   # kept out of package.json so CI stays fast
    npx playwright install chromium ffmpeg
    npm run dev -- --port 5200      # in another shell
    node scripts/record-demo.mjs

It records the browser, so it covers everything that happens inside the app.
Adding to the home screen, the iOS share sheet and Calendar are operating system
screens that no browser can record — those still need a screen recording from a
real phone.

Note that Playwright drops the page into the video canvas *unscaled*, so asking
for a video larger than the viewport just pads the frame with grey. The recorder
captures at viewport size and lets ffmpeg upscale.

### Icons

`npm run icons` regenerates `public/*.png` from the mark defined in
`scripts/make-icons.mjs`. Needs `rsvg-convert` (`brew install librsvg`). The
icons are committed, so CI never runs this.

## How it is put together

No runtime dependencies. Vanilla TypeScript, ~19 kB of JavaScript.

| File | What it does |
| --- | --- |
| `src/main.ts` | UI and event wiring |
| `src/store.ts` | localStorage read/write |
| `src/week.ts` | Monday-first week maths |
| `src/surface.ts` | The drawing surface the sheet layout is written against |
| `src/pdf.ts` | A small PDF writer — text, lines, circles, standard fonts |
| `src/raster.ts` | The same surface over a canvas, exported as a PNG |
| `src/sheet.ts` | Lays the week out as the printed form, and as plain text |
| `src/reminder.ts` | Builds the repeating calendar event (RFC 5545 `.ics`) |
| `src/share.ts` | Web Share API, with download and clipboard fallbacks |
| `vite.config.ts` | Build config, plus the plugin that emits `dist/sw.js` |

The PDF is generated on the phone, not fetched. That is why `src/pdf.ts` exists
instead of a library: it keeps the whole app inside the service worker cache, so
a member with no signal at the end of the week can still produce their sheet.

The PDF and the image come from a single layout pass (`drawWeek` in `sheet.ts`)
written against the `Surface` interface, which `pdf.ts` and `raster.ts` each
implement. Add a row to the sheet and both formats gain it; there is no second
layout to keep in sync.

Exporting a week with nothing filled in produces a blank version of the original
paper form, which prints fine for anyone who would rather use paper.
