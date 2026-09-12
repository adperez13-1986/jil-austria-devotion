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

The `…` button next to Share offers two alternatives: download the PDF, or send
the week as plain text (better for Messenger and Viber, where a pasted message
is easier to read on the leader's side than an attachment).

Any past week can be shared — use the arrows to move back, then Share.

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
| `src/pdf.ts` | A small PDF writer — text, lines, circles, standard fonts |
| `src/sheet.ts` | Lays the week out as the printed form, and as plain text |
| `src/share.ts` | Web Share API, with download and clipboard fallbacks |
| `vite.config.ts` | Build config, plus the plugin that emits `dist/sw.js` |

The PDF is generated on the phone, not fetched. That is why `src/pdf.ts` exists
instead of a library: it keeps the whole app inside the service worker cache, so
a member with no signal at the end of the week can still produce their sheet.

Exporting a week with nothing filled in produces a blank version of the original
paper form, which prints fine for anyone who would rather use paper.
