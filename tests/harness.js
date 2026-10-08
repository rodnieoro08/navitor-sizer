/* Regression harness for the Navitor sizer.
 *
 * Loads the REAL index.html DOM (+ fragments) into jsdom, then evaluates the
 * app scripts in exactly the order index.html lists them, calls init(), and
 * drives the page the way a user does (fill inputs, click Recommend).
 * Records recommendation output + rendered result text for a fixed case set.
 *
 * Runs every case in both logic modes:
 *   classic -> tests/baseline.json        (pre-v49 behaviour; must stay identical)
 *   field   -> tests/baseline-field.json  (Field logic at shared edges, default since v49)
 *
 *   node harness.js                       compare both modes against their baselines
 *   node harness.js --mode classic|field  only that mode
 *   node harness.js --write               (re)write the baseline(s)
 *   node harness.js --compare file        compare (single --mode) against another snapshot
 *   node harness.js --out file            just dump current output (single --mode)
 *
 * All inputs are synthetic. No patient data.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

async function boot() {
  const html = read("index.html");
  const bodyHtml = html.replace(/<script>[\s\S]*<\/script>/, "");
  const dom = new JSDOM(bodyHtml, { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
  const w = dom.window;
  await new Promise((r) => (w.document.readyState === "complete" ? r() : w.addEventListener("load", r)));
  w.scrollTo = () => {};
  const ctx = dom.getInternalVMContext();
  CTX = ctx;
  const errors = [];
  w.addEventListener("error", (e) => errors.push(String(e.message || e)));
  const origErr = w.console.error;
  w.console.error = (...a) => { errors.push(a.map(String).join(" ")); };

  // Fragments, same order as index.html's put() calls.
  const puts = [...html.matchAll(/put\("([^"]+)",\s*"\.\/([^"?]+)/g)];
  for (const [, id, file] of puts) w.document.getElementById(id).insertAdjacentHTML("beforeend", read(file));

  // Scripts, same order as index.html's add() calls (skip CDN pdf.js).
  const scripts = [...html.matchAll(/await add\("\.\/([^"]+)"\)/g)].map((m) => m[1]);
  for (const s of scripts) {
    // Run as a classic <script> (shared global lexical scope for top-level const/let), not indirect eval.
    try { new vm.Script(read(s), { filename: s }).runInContext(ctx); } catch (e) { errors.push(`${s}: ${e.message}`); }
  }
  try { new vm.Script("if (typeof init === 'function') init();").runInContext(ctx); } catch (e) { errors.push("init: " + e.message); }
  return { dom, w, errors, scripts };
}

const FIELDS = ["peri","area","periPD","meanD","minD","maxD","stj","sovMin","sovL","sovR","sovNC","sovH","lca","rca","lvot","aa","access","notes"];
const CALCS = ["calcAnn","calcLvot","calcStj","calcCusp"];
const TOGGLES = ["tEccLeaf","tProtLvot","tCond","tPpm"];

function setInputs(w, c) {
  const doc = w.document;
  FIELDS.forEach((id) => { const el = doc.getElementById(id); if (el) el.value = ""; });
  CALCS.forEach((id) => run(w, `setCalc("${id}", ${JSON.stringify(c[id] || "unknown")})`));
  TOGGLES.forEach((id) => run(w, `setToggle("${id}", ${!!c[id]})`));
  Object.keys(c).forEach((k) => {
    if (CALCS.includes(k) || TOGGLES.includes(k)) return;
    const el = doc.getElementById(k);
    if (el) el.value = String(c[k]);          // sovH may not exist as a field in the live page
    else (setInputs.missing = setInputs.missing || new Set()).add(k);
  });
  // peri-pd mount listens for "input" on peri
  doc.getElementById("peri").dispatchEvent(new w.Event("input", { bubbles: true }));
  if (c.periPD != null) doc.getElementById("periPD").value = String(c.periPD);
}

let CTX;
const run = (w, code) => new vm.Script(code).runInContext(CTX);
const r6 = (x) => (typeof x === "number" ? +x.toFixed(6) : x);

function summarize(r) {
  if (!r) return null;
  if (r.error) return { error: r.error };
  return {
    primary: r.primary ? r.primary.size.size : null,
    coPrimary: r.coPrimary ? r.coPrimary.size.size : null,
    confidence: r.confidence,
    boundary: r.boundary ? `${r.boundary.p}:${r.boundary.a}/${r.boundary.b}` : null,
    eligible: r.eligible.map((e) => e.size.size),
    checks: r.checks,
    ...(r.alternative ? { alternative: r.alternative.size.size } : {}),
    ...(r.overlap ? { overlap: { choice: r.overlap.choice, flag: r.overlap.flag, why: r.overlap.why, lines: r.overlap.lines.map((l) => `${l.title}: ${l.dir} | ${l.text}`) } } : {}),
    evals: r.evals.map((e) => ({
      size: e.size.size, eligible: e.eligible, score: r6(e.score),
      matches: e.matches, available: e.available, hard: e.hard, flags: e.flags
    }))
  };
}

function runCase(w, name, c) {
  setInputs(w, c);
  w.document.getElementById("btn-go").click();
  const rec = w.__lastRec;
  const body = w.document.getElementById("result-body");
  const rows = [...body.querySelectorAll("table tbody tr")].map((tr) => tr.className.trim() + "|" + tr.textContent.replace(/\s+/g, " ").trim());
  return {
    name,
    periPD: w.document.getElementById("periPD").value,
    cValveSize: (w.document.getElementById("cValveSize") || {}).value || "",
    summary: summarize(rec && rec.evals ? rec : (rec && rec.error ? rec : null)),
    resultText: body.textContent.replace(/\s+/g, " ").trim(),
    rows,
    ...(MODE === "field" ? { logicLine: (w.document.getElementById("result-logic") || {}).textContent || "" } : {})
  };
}

// Full example data as written in app.js loadExample() (direct, not via the buttons)
const EX = {
  mid27: { peri: 75.2, area: 448, meanD: 24.1, minD: 21.8, maxD: 26.5, stj: 29.4, sovL: 32.1, sovR: 31.0, sovNC: 33.4, sovH: 18.2, lca: 13.6, rca: 16.1, lvot: 23.4, aa: 34.0, access: 6.2, calcAnn: "mild", calcLvot: "none", calcStj: "none" },
  edge66: { peri: 66.0, area: 340, meanD: 21.0, minD: 18.6, maxD: 23.8, stj: 26.2, sovL: 27.4, sovR: 26.8, sovNC: 28.1, sovH: 16.0, lca: 11.2, rca: 14.0, lvot: 20.1, aa: 30.0, access: 5.4, calcAnn: "moderate", calcLvot: "mild", calcStj: "moderate" },
  edge79: { peri: 79.0, area: 500, meanD: 25.2, minD: 23.1, maxD: 27.4, stj: 31.8, sovL: 33.0, sovR: 31.2, sovNC: 34.5, sovH: 17.5, lca: 14.8, rca: 17.2, lvot: 24.8, aa: 36.5, access: 6.8, calcAnn: "mild", calcLvot: "none", calcStj: "none" }
};
// A generous root so only the thing under test matters
const ROOT_OK = { stj: 36, sovMin: 40, lca: 15, rca: 15, aa: 36, access: 7 };

function namedCases() {
  const c = [];
  const add = (name, o) => c.push([name, o]);
  Object.entries(EX).forEach(([k, v]) => add(`example ${k} (full data)`, v));
  [60, 63, 65.9, 66, 66.04, 66.1, 70, 72, 72.5, 73, 73.1, 75, 78.9, 79, 79.04, 80, 84.9, 85, 90, 95, 95.1, 55].forEach((p) =>
    add(`peri ${p} only`, { peri: p }));
  [66, 72, 73, 79, 85].forEach((p) => add(`peri ${p} + roomy root`, { peri: p, ...ROOT_OK }));
  [66, 72, 73, 79, 85].forEach((p) => add(`peri ${p} + area/mean consistent`, { peri: p, area: Math.round(Math.PI * Math.pow(p / Math.PI / 2, 2) * 1), meanD: +(p / Math.PI).toFixed(1), ...ROOT_OK }));
  // low coronary
  [9, 9.9, 10, 11.9, 12].forEach((h) => { add(`peri 75 lca ${h}`, { peri: 75, lca: h, rca: 15 }); add(`peri 75 rca ${h}`, { peri: 75, lca: 15, rca: h }); });
  add("peri 79 low coronary 9", { peri: 79, lca: 9, rca: 14, sovMin: 35, aa: 36 });
  add("peri 66 low coronary 11", { peri: 66, lca: 11, rca: 14, sovMin: 30, aa: 30 });
  // narrow SOV
  [24, 26, 26.9, 27, 28.9, 29, 30.9, 31, 32.9, 33.9, 34, 35.9].forEach((s) => add(`peri 72 sovMin ${s}`, { peri: 72, sovMin: s }));
  [26, 27, 28, 29, 30, 31].forEach((s) => add(`peri 79 sovMin ${s}`, { peri: 79, sovMin: s }));
  [30, 31, 33, 34, 35, 36].forEach((s) => add(`peri 85 sovMin ${s}`, { peri: 85, sovMin: s }));
  add("peri 66 sov split L/R/NC min wins", { peri: 66, sovL: 30, sovR: 26.5, sovNC: 29 });
  // SOV height (no field in live page; see PR)
  [10, 14.9, 15, 16].forEach((h) => add(`peri 75 sovH ${h}`, { peri: 75, sovH: h }));
  add("example mid27 with sovH 12", { ...EX.mid27, sovH: 12 });
  add("example edge66 with sovH 14", { ...EX.edge66, sovH: 14 });
  // ascending aorta
  [25, 26, 28, 30, 32, 36, 38, 40, 42, 44, 46].forEach((a) => { add(`peri 72 aa ${a}`, { peri: 72, aa: a }); add(`peri 85 aa ${a}`, { peri: 85, aa: a }); });
  // access
  [4.5, 5, 5.4, 5.5, 6].forEach((a) => add(`peri 72 access ${a}`, { peri: 72, access: a }));
  // STJ / ellipticity / LVOT / calcium
  [22, 24, 26, 28, 30].forEach((s) => add(`peri 79 stj ${s}`, { peri: 79, stj: s }));
  add("ellipticity 0.70", { peri: 72, minD: 17.5, maxD: 25 });
  add("ellipticity 0.73", { peri: 72, minD: 18.25, maxD: 25 });
  add("ellipticity min only", { peri: 72, minD: 17 });
  add("lvot small vs mean", { peri: 72, meanD: 23, lvot: 21 });
  add("lvot just ok vs mean", { peri: 72, meanD: 23, lvot: 21.5 });
  ["none", "mild", "moderate", "severe"].forEach((k) => {
    add(`peri 79 stj calcium ${k}`, { peri: 79, calcStj: k });
    add(`peri 79 lvot calcium ${k}`, { peri: 79, calcLvot: k });
    add(`peri 79 annular calcium ${k}`, { peri: 79, calcAnn: k });
  });
  add("all calcium severe peri 85", { peri: 85, calcAnn: "severe", calcLvot: "severe", calcStj: "severe" });
  // consistency flags / area / mean disagreement
  add("area disagrees with peri", { peri: 75, area: 600 });
  add("mean disagrees with peri", { peri: 75, meanD: 28 });
  add("area/mean both disagree", { peri: 75, area: 300, meanD: 20 });
  add("area+mean disagree each other only", { peri: 75, area: 520, meanD: 21.9 });
  add("minmax avg vs mean", { peri: 75, meanD: 24, minD: 20, maxD: 24 });
  add("area in band for other size", { peri: 66, area: 400 });
  add("mean in band for other size", { peri: 66, meanD: 22.5 });
  // partial inputs / errors
  add("no inputs", {});
  add("area only", { area: 448 });
  add("meanD only", { meanD: 24 });
  add("periPD only 23.9", { periPD: 23.9 });
  add("periPD only 21.0", { periPD: 21.0 });
  add("peri out of all ranges 50", { peri: 50 });
  add("peri out of all ranges 100", { peri: 100 });
  // combined stress
  add("everything bad peri 72", { peri: 72, area: 300, meanD: 29, minD: 15, maxD: 26, stj: 20, sovMin: 25, lca: 9, rca: 8, lvot: 18, aa: 20, access: 4, calcAnn: "severe", calcLvot: "severe", calcStj: "severe" });
  add("peri 72 stacked soft penalties", { peri: 72, stj: 24, sovMin: 29.5, access: 5.0, minD: 17, maxD: 25, calcStj: "moderate" });

  // ---- Shared-edge field logic (v49). Worked example 66 mm / SOV 27 and the same pattern at 72.5 / 79 / 85.
  // edge: [peri, larger SOV floor, area in both, area below larger, LVOT >= PD, LVOT < PD]
  const EDGES = { 66: [66, 27, 340, 330, 21.5, 19], 72.5: [72.5, 29, 410, 400, 23.5, 21], 79: [79, 31, 485, 470, 25.5, 23], 85: [85, 34, 565, 550, 27.5, 25] };
  Object.entries(EDGES).forEach(([k, [p, f, aBoth, aLow, lvOk, lvSmall]]) => {
    const tight3 = { sovL: f, sovR: f, sovNC: f };
    const good = { peri: p, calcCusp: "moderate", area: aBoth + 20 > 0 ? (k === "66" ? 360 : aBoth) : aBoth, lvot: lvOk, sovL: f, sovR: f, sovNC: f + 0.5 };
    add(`edge ${k} (a) SOV ${f}x3, no calcium, no area`, { peri: p, ...tight3 });
    add(`edge ${k} (b) cusp mod + area + LVOT ok + uniform SOV`, good);
    add(`edge ${k} (c) one large sinus (not uniform)`, { ...good, sovNC: f + 4 });
    add(`edge ${k} (d) SOV min only`, { peri: p, calcCusp: "moderate", area: good.area, lvot: lvOk, sovMin: f });
    add(`edge ${k} (e) LVOT smaller than annulus`, { ...good, lvot: lvSmall });
    add(`edge ${k} (f) area below larger range`, { ...good, area: aLow });
    add(`edge ${k} (a2) SOV min only ${f}, nothing else`, { peri: p, sovMin: f });
    add(`edge ${k} protruding LVOT calcium veto`, { ...good, tProtLvot: true });
    add(`edge ${k} conduction risk blocks step-up`, { ...good, tCond: true });
    add(`edge ${k} eccentric leaflet calcium instead of cusp`, { ...good, calcCusp: "mild", tEccLeaf: true });
    add(`edge ${k} LVOT moderate calcium instead of cusp`, { ...good, calcCusp: "none", calcLvot: "moderate" });
    const roomy = { peri: p, sovL: f + 4, sovR: f + 4, sovNC: f + 5 };
    add(`edge ${k} roomy SOV, nothing else`, roomy);
    add(`edge ${k} roomy SOV + calcium`, { ...roomy, calcAnn: "moderate" });
    add(`edge ${k} roomy SOV + PPM concern`, { ...roomy, tPpm: true });
    add(`edge ${k} roomy SOV + PPM + LVOT small`, { ...roomy, tPpm: true, lvot: lvSmall });
    add(`edge ${k} tight SOV + PPM concern`, { ...good, calcCusp: "none", tPpm: true });
  });
  add("edge 66 roomy SOV + area above 23 range", { peri: 66, sovL: 31, sovR: 31, sovNC: 32, area: 350 });
  add("edge 79 hard exclude larger by AA", { peri: 79, sovL: 35, sovR: 35, sovNC: 35, aa: 31, calcAnn: "severe" });
  add("edge 66 smaller excluded by AA (larger only)", { peri: 66, aa: 37, sovMin: 30 });
  add("edge 85 STJ smaller than 35 label", { peri: 85, sovL: 38, sovR: 38, sovNC: 39, stj: 30, calcAnn: "moderate" });
  return c;
}

function sweep(w) {
  const out = {};
  for (let p = 56; p <= 98; p += 0.25) {
    for (const [tag, extra] of [["bare", {}], ["roomy", ROOT_OK], ["tightSOV", { sovMin: 31.5 }]]) {
      setInputs(w, { peri: p, ...extra });
      w.document.getElementById("btn-go").click();
      const s = summarize(w.__lastRec);
      out[`${p}|${tag}`] = s.error ? "ERR" :
        `${s.primary}/${s.coPrimary}/${s.confidence}/${s.boundary}/[${s.evals.map((e) => (e.eligible ? e.score.toFixed(4) : "x")).join(",")}]`;
    }
  }
  return out;
}

// Synthetic OCR / sticker text (no real data) to protect parser behaviour
const MENSIO_TEXTS = [
  "Annulus Perimeter 75.2 mm Area 448 mm2 Mean diameter 24.1 Min Ø 21.8 Max Ø 26.5 STJ Ø 29.4 LVOT Ø 23.4 Asc. Aorta Ø 34.0 LCA height 13.6 RCA height 16.1",
  "Perimeter 752 Area 448,5 mm² mean diameter 241 sinus of valsalva height 18.2 diameters 32.1 31.0 33.4",
  "perimeter derived 23.9 perimeter 75.2 SOV L 32.1 SOV R 31.0 SOV NC 33.4 left main 12.5 right coronary 15",
  "P 74.2 mm A 440 mm2 STJ: 30 AA 33 lvot 22",
  "nothing useful here"
];
const STICKER_TEXTS = [
  "NVRO-27 REF LOT 1234567 SN 20860808 2028-05-31 FNAV-DS-SM LOT ABC12345 2027-11-30 NVTR-LS-SM LOT XYZ98765 2027-10-15",
  "(01)05415067045805(17)281231(21)20860808 (01)05415067031372(17)271130(10)ABC12345 (01)05415067036667(17)271015(10)XYZ98765",
  "01054150670458051728123121208608080154150670313721727113010ABC12345",
  "NVTR 29 FNAV DS LG",
  "random text"
];

function ocrRecords(w) {
  const out = { mensio: [], stickers: [] };
  MENSIO_TEXTS.forEach((t) => out.mensio.push(run(w, `JSON.stringify(parseMensio(${JSON.stringify(t)}))`)));
  STICKER_TEXTS.forEach((t) => out.stickers.push(run(w, `JSON.stringify(extractDevicesFromText(${JSON.stringify(t)}))`)));
  // applyDevices into the DOM (ocr-strict version overwrites unconditionally; case.js version only fills blanks)
  out.applyDevices = [];
  STICKER_TEXTS.slice(0, 2).forEach((t, i) => {
    ["vRef","vSn","vExp","dRef","dLot","dExp","lRef","lLot","lExp","cSheath","cProcSheath","cValveSize"].forEach((id) => { const el = w.document.getElementById(id); if (el) el.value = ""; });
    const n = run(w, `applyDevices(extractDevicesFromText(${JSON.stringify(t)}))`);
    const vals = {};
    ["vRef","vSn","vExp","dRef","dLot","dExp","lRef","lLot","lExp","cSheath","cProcSheath","cValveSize"].forEach((id) => { vals[id] = (w.document.getElementById(id) || {}).value; });
    out.applyDevices.push({ n, vals });
  });
  // applyMensio into the DOM
  out.applyMensio = MENSIO_TEXTS.slice(0, 3).map((t) => {
    setInputs(w, {});
    const n = run(w, `applyMensio(parseMensio(${JSON.stringify(t)}))`);
    const vals = {};
    FIELDS.forEach((id) => { vals[id] = (w.document.getElementById(id) || {}).value; });
    return { n, vals };
  });
  // helper functions
  out.helpers = run(w, `JSON.stringify({
    fixDec: [fixDec(752,55,100), fixDec(75.2,55,100), fixDec(5,55,100), fixDec(NaN,1,2)],
    inRangeArr: [inRange(5,[1,9]), inRange(null,[1,9]), inRange(5,[6,9])],
    isBoundary: [66,72,72.5,73,79,85,70,null].map(isBoundary),
    cf: consistencyFlags({peri:75,area:300,meanD:20,minD:10,maxD:30})
  })`);
  return out;
}

function liveButtonExamples(w) {
  // What the three example buttons actually do in the live page
  const out = [];
  for (const ex of ["mid27", "edge66", "edge79"]) {
    const errsBefore = harnessErrors.length;
    run(w, `try { loadExample("clear"); } catch (e) { window.__exErr = "clear:" + e.message; }`);
    const clearErr = w.__exErr; w.__exErr = null;
    run(w, `try { loadExample(${JSON.stringify(ex)}); } catch (e) { window.__exErr = e.message; }`);
    const loadErr = w.__exErr; w.__exErr = null;
    const vals = {};
    FIELDS.forEach((id) => { vals[id] = (w.document.getElementById(id) || {}).value; });
    CALCS.forEach((id) => { vals[id] = w.document.getElementById(id).dataset.v; });
    w.document.getElementById("btn-go").click();
    out.push({
      example: ex, clearErr: clearErr || null, loadErr: loadErr || null, fieldsAfterLoad: vals,
      summary: summarize(w.__lastRec),
      resultText: w.document.getElementById("result-body").textContent.replace(/\s+/g, " ").trim()
    });
  }
  // does Clear really clear everything?
  run(w, `try { loadExample("mid27"); } catch (e) {}`);
  w.document.getElementById("access").value = "6.2"; w.document.getElementById("lca").value = "13.6"; w.document.getElementById("notes").value = "x";
  run(w, `try { loadExample("clear"); } catch (e) {}`);
  out.push({ clearLeaves: ["peri","sovNC","lca","rca","lvot","aa","access","notes"].filter((id) => w.document.getElementById(id).value !== "") });
  return out;
}

let harnessErrors = [];
let MODE = "classic";
async function collect(mode) {
  MODE = mode;
  setInputs.missing = new Set();
  const { w, errors, scripts } = await boot();
  w.localStorage.setItem("navitorLogic", mode);
  harnessErrors = errors;
  const result = { scripts, cases: {}, sweep: null, ocr: null, buttons: null };
  // Button examples run first on a pristine page
  result.buttons = liveButtonExamples(w);
  for (const [name, c] of namedCases()) result.cases[name] = runCase(w, name, c);
  result.sweep = sweep(w);
  result.ocr = ocrRecords(w);
  result.bootErrors = errors.slice();
  result.missingInputIds = [...(setInputs.missing || [])];
  return result;
}

// ---- comparison -----------------------------------------------------------
function flatten(o, p = "", out = {}) {
  if (o && typeof o === "object") for (const k of Object.keys(o)) flatten(o[k], p ? `${p}.${k}` : k, out);
  else out[p] = o;
  return out;
}
function diff(a, b) {
  const fa = flatten(a), fb = flatten(b), keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  const rows = [];
  for (const k of keys) if (JSON.stringify(fa[k]) !== JSON.stringify(fb[k])) rows.push({ key: k, before: fa[k], after: fb[k] });
  return rows;
}

const BASE = { classic: path.join(__dirname, "baseline.json"), field: path.join(__dirname, "baseline-field.json") };

(async () => {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true) : null; };
  const modes = arg("--mode") && arg("--mode") !== true ? [arg("--mode")] : ["classic", "field"];
  for (const mode of modes) {
    console.log(`=== mode: ${mode} ===`);
    await runMode(mode, arg);
  }
})();

async function runMode(mode, arg) {
  const cur = await collect(mode);
  const base = BASE[mode];
  if (arg("--out")) { fs.writeFileSync(arg("--out"), JSON.stringify(cur, null, 1)); console.log("wrote", arg("--out")); return; }
  if (arg("--write")) { const f = arg("--write") === true ? base : arg("--write"); fs.writeFileSync(f, JSON.stringify(cur, null, 1) + "\n"); console.log("wrote", f); return; }
  const against = arg("--compare") && arg("--compare") !== true ? arg("--compare") : base;
  const prev = JSON.parse(fs.readFileSync(against, "utf8"));
  // `scripts` list legitimately changes when patch files are merged; exclude it from the diff
  const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.scripts; return c; };
  const rows = diff(strip(prev), strip(cur));
  const nCases = Object.keys(cur.cases).length, nSweep = Object.keys(cur.sweep).length;
  console.log(`cases: ${nCases}, sweep points: ${nSweep}, ocr samples: ${cur.ocr.mensio.length + cur.ocr.stickers.length}`);
  console.log("boot errors:", cur.bootErrors.length ? cur.bootErrors : "none");
  if (!rows.length) { console.log(`IDENTICAL to ${path.relative(process.cwd(), against)}`); return; }
  console.log(`${rows.length} differing value(s) vs ${path.relative(process.cwd(), against)}:`);
  rows.slice(0, 200).forEach((r) => console.log(`  ${r.key}\n    before: ${JSON.stringify(r.before)}\n    after:  ${JSON.stringify(r.after)}`));
  process.exitCode = 1;
}
