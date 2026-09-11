# Navitor Vision Sizer (iPhone web app)

Personal decision-support tool for Navitor Vision TAVI sizing from 3mensio numbers.

Not official Abbott software. Not CE / UKCA marked. Heart Team decides.

## Use on iPhone tomorrow

Best: put the folder on any HTTPS host (GitHub Pages, Netlify Drop, hospital intranet). Then:

1. Open the site in Safari (not Chrome).
2. Share → Add to Home Screen.
3. Open the icon. It runs full-screen and caches for offline MDT use.

Without a host: AirDrop `navitor-sizer` to the iPhone, open `index.html` in Safari via Files. Add to Home Screen still works on recent iOS for local files less reliably; HTTPS is the robust path.

## What to enter

Minimum: annulus perimeter **or** area **or** mean diameter.

For boundary perimeters (66, 72–73, 79, 85 mm) also enter STJ, SOV widths, SOV height, coronary heights, LVOT, calcium grades, access.

Photos are a visual reference. PDFs with real text can auto-fill fields — confirm every number.

## Files

- `index.html` `styles.css` `app.js` — app
- `DECISION_TREE.md` — full written algorithm
- `manifest.json` `sw.js` `icon.svg` — home-screen / offline
