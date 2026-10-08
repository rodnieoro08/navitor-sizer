# Navitor Vision Sizer

Personal decision-support sizing tool and proctor case card for Navitor Vision.
Plain JavaScript, no build step, installable as an iPhone PWA.

**Live:** https://rodnieoro08.github.io/navitor-sizer/

> Not official Abbott software. Not CE / UKCA marked. The Heart Team decides.
> Never commit patient photos or identifiable reports to this repo.

## What it does

- Recommends a Navitor Vision size from 3mensio numbers. Perimeter and perimeter-derived diameter (peri ÷ π) decide; area and entered mean diameter are checks only. See [DECISION_TREE.md](DECISION_TREE.md).
- Proctor case form, with sticker photos read on-device (OCR) into REF / SN / LOT / expiry.
- Exports the case card to Apple Notes through the iOS share sheet (or copies the text).

## File layout

Everything the site needs sits in the repo root (GitHub Pages serves it straight from `main`, `/ (root)`). Do not nest these in a folder.

| File | Purpose |
|---|---|
| `index.html` | Shell, Size-tab form, loads the fragments and scripts (in this order: pdf.js CDN, `app.js`, `case.js`, `mensio-ocr.js`) |
| `app.js` | Size ranges, scoring, Result tab, examples, charts, `init()` |
| `case.js` | Case form, Notes export, sticker OCR |
| `mensio-ocr.js` | 3mensio text / PDF / photo parsing into the Size tab |
| `frag-*.html` | Tab fragments fetched into `index.html` at start-up |
| `styles.css`, `manifest.json`, `icon.svg` | Styling and PWA metadata |
| `sw.js` | Service worker (network first, cache fallback) |
| `navitor-*.jpg` | Public Navitor dimension / diagram images shown on the Charts tab |
| `tests/` | Dev-only regression and smoke tests (not needed by the site) |

## Releasing a change (bump the cache version)

1. Edit the files and merge to `main`. Pages redeploys in a minute or so.
2. Bump the version so phones pick it up. Both places must change together:
   - `index.html`: replace every `?v=NN` with the new number (fragments and scripts).
   - `sw.js`: change `const CACHE = "navitor-sizer-vNN"`.
3. If you add or remove a root file, update `ASSETS` in `sw.js` too.
4. On iPhone, open the app, close it fully and reopen (or pull to refresh in Safari). Re-add to Home Screen only if it still looks stale.

## Tests (optional, local)

```
cd tests && npm install
npm test        # sizing regression: compares against tests/baseline.json
npm run smoke   # headless Chrome load + examples + Recommend (needs google-chrome)
```

Set `CHROME=/path/to/chrome` if it is not at `/usr/bin/google-chrome`.
`npm test` compares every synthetic case against `tests/baseline-field.json` (Field logic at shared edges). Inputs and outputs are synthetic only. If you change sizing on purpose, run `npm run baseline` and review the diff.

## Sizing logic

The app uses **Field logic (shared edges)** only. At a shared IFU perimeter edge the smaller valve is the default; ranked tie-breakers decide whether to step up. See [DECISION_TREE.md](DECISION_TREE.md). The pre-field-logic behaviour is kept as the GitHub release [`old-logic-v48`](https://github.com/rodnieoro08/navitor-sizer/releases/tag/old-logic-v48).
