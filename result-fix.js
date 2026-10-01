function rangeOk(v, r) {
  return v != null && Array.isArray(r) && v >= r[0] && v <= r[1];
}
function inRange(v, r) {
  return rangeOk(v, r);
}
function readNum(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : null;
}
function gather() {
  const sovL = readNum("sovL"), sovR = readNum("sovR"), sovNC = readNum("sovNC");
  const sovs = [sovL, sovR, sovNC].filter((x) => x != null);
  const calc = (id) => {
    const el = document.getElementById(id);
    return (el && el.dataset && el.dataset.v) || "unknown";
  };
  const notes = document.getElementById("notes");
  return {
    peri: readNum("peri"), area: readNum("area"), periPD: readNum("periPD"),
    meanD: readNum("meanD"), minD: readNum("minD"), maxD: readNum("maxD"),
    stj: readNum("stj"),
    sovW: sovs.length ? Math.min.apply(null, sovs) : readNum("sovMin"),
    sovL: sovL, sovR: sovR, sovNC: sovNC, sovH: readNum("sovH"),
    lca: readNum("lca"), rca: readNum("rca"), lvot: readNum("lvot"),
    aa: readNum("aa"), access: readNum("access"),
    calcAnn: calc("calcAnn"), calcLvot: calc("calcLvot"), calcStj: calc("calcStj"),
    notes: notes ? notes.value.trim() : ""
  };
}
function evaluateSize(s, d) {
  const flags = [];
  const hard = [];
  let score = 0;
  let matches = 0;
  let available = 0;
  const pd = d.peri != null ? d.peri / Math.PI : (d.periPD != null ? Number(d.periPD) : null);
  const periC = centrality(d.peri, s.peri);
  const pdC = pd == null ? 0 : centrality(pd, s.meanD);
  const periOk = d.peri != null && rangeOk(d.peri, s.peri);
  const pdOk = pd != null && rangeOk(+pd.toFixed(1), s.meanD);
  if (d.peri != null) {
    available++;
    if (periOk) { matches++; score += 0.7 * Math.max(0.15, periC); }
    else { score += 0.1 * periC; flags.push("Perimeter " + d.peri + " mm is outside " + s.size + " mm range " + s.peri[0] + "\u2013" + s.peri[1]); }
  }
  if (pd != null) {
    available++;
    if (pdOk) { matches++; score += 0.3 * Math.max(0.15, pdC); }
    else flags.push("Perimeter-derived diameter " + pd.toFixed(1) + " mm is outside the " + s.size + " mm annulus band " + s.meanD[0] + "\u2013" + s.meanD[1]);
  }
  if (periOk && d.area != null && !rangeOk(d.area, s.area)) {
    flags.push("Area " + d.area + " mm\u00b2 is outside the reference band " + s.area[0] + "\u2013" + s.area[1] + ". It does not change the perimeter decision.");
  }
  if (periOk && d.meanD != null && !rangeOk(d.meanD, s.meanD)) {
    flags.push("Entered mean diameter " + d.meanD + " mm disagrees with the perimeter-derived diameter. Perimeter decides.");
  }
  if (d.sovW != null && d.sovW < s.sovW) hard.push("SOV width " + d.sovW + " mm < " + s.sovW + " mm required for " + s.size + " mm");
  if (d.aa != null && !rangeOk(d.aa, s.aa)) hard.push("Ascending aorta " + d.aa + " mm outside " + s.aa[0] + "\u2013" + s.aa[1] + " mm for " + s.size + " mm");
  const cors = [d.lca, d.rca].filter((x) => x != null);
  if (cors.length && Math.min.apply(null, cors) < 10) hard.push("Coronary height " + Math.min.apply(null, cors) + " mm is below the 10 mm minimum");
  if (d.access != null && d.access < s.access) { flags.push("Access " + d.access + " mm < FlexNav minimum " + s.access.toFixed(1) + " mm for this size"); score -= 0.2; }
  if (d.sovW != null && d.sovW >= s.sovW && d.sovW < s.sovW + 2) { flags.push("SOV width only " + (d.sovW - s.sovW).toFixed(1) + " mm above the " + s.size + " mm floor"); score -= 0.18; }
  if (d.stj != null && d.stj < s.size) { flags.push("STJ " + d.stj + " mm is smaller than " + s.size + " mm labelled diameter"); score -= 0.15; }
  const ell = ellipticity(d);
  if (ell != null && ell < 0.73) { flags.push("Ellipticity " + ell.toFixed(2) + " < 0.73"); score -= 0.15; }
  if (d.lvot != null && d.meanD != null && d.lvot + 1.5 < d.meanD) { flags.push("LVOT " + d.lvot + " mm smaller than annulus mean " + d.meanD + " mm"); score -= 0.08; }
  const calcPenalty = { none: 0, mild: 0.02, moderate: 0.1, severe: 0.22, unknown: 0 };
  if (d.calcStj === "moderate" || d.calcStj === "severe") { flags.push("STJ calcium " + d.calcStj); score -= calcPenalty[d.calcStj] || 0; }
  if (d.calcLvot === "severe") { flags.push("Severe LVOT calcium"); score -= 0.1; }
  if (d.calcAnn === "severe") { flags.push("Severe annular calcium"); score -= 0.08; }
  const core = d.peri != null ? periOk : pdOk;
  const eligible = hard.length === 0 && core;
  return { size: s, score, matches, available, flags, hard, eligible, periC, areaC: centrality(d.area, s.area), meanC: pdC };
}
function recommend(d) {
  const checks = consistencyFlags(d);
  if (d.peri == null && d.periPD == null && d.meanD == null) {
    return { error: "Enter perimeter. The decision uses perimeter and perimeter-derived diameter." };
  }
  const evals = SIZES.map((s) => evaluateSize(s, d));
  const eligible = evals.filter((e) => e.eligible).sort((a, b) => b.score - a.score);
  const nearest = evals.slice().sort((a, b) => b.score - a.score);
  const boundary = isBoundary(d.peri);
  if (!eligible.length) return { d: d, checks: checks, evals: evals, eligible: [], nearest: nearest, primary: null, coPrimary: null, confidence: "low", boundary: boundary };
  const best = eligible[0];
  const coPrimary = eligible[1] && Math.abs(best.score - eligible[1].score) < 0.08 ? eligible[1] : null;
  let confidence = "high";
  if (best.flags.length >= 2 || coPrimary || boundary) confidence = "mod";
  if (checks.length) confidence = confidence === "high" ? "mod" : confidence;
  return { d: d, checks: checks, evals: evals, eligible: eligible, nearest: nearest, primary: best, coPrimary: coPrimary, confidence: confidence, boundary: boundary };
}
function navitorGo() {
  try {
    const r = recommend(gather());
    window.__lastRec = r;
    renderResult(r);
    const valve = document.getElementById("cValveSize");
    if (r.primary && valve && !valve.value) {
      valve.value = r.coPrimary ? (r.primary.size.size + " or " + r.coPrimary.size.size) : String(r.primary.size.size);
    }
    showScreen("result");
  } catch (err) {
    const box = document.getElementById("result-body");
    if (box) box.innerHTML = "<div class=\"empty\">" + (err && err.message ? err.message : err) + "</div>";
    if (typeof showScreen === "function") showScreen("result");
  }
}
function init() {
  try { bindSeg("calcAnn"); bindSeg("calcLvot"); bindSeg("calcStj"); } catch (e) {}
  try { setCalc("calcAnn", "unknown"); setCalc("calcLvot", "unknown"); setCalc("calcStj", "unknown"); } catch (e) {}
  try { renderCharts(); } catch (e) {}
  const go = document.getElementById("btn-go");
  if (go) go.onclick = navitorGo;
  const clear = document.getElementById("btn-clear");
  if (clear) clear.onclick = function () { loadExample("clear"); };
  document.querySelectorAll("[data-ex]").forEach(function (b) { b.onclick = function () { loadExample(b.dataset.ex); }; });
  document.querySelectorAll(".nav button").forEach(function (b) { b.onclick = function () { showScreen(b.dataset.screen); }; });
  const file = document.getElementById("file");
  if (file) file.onchange = function (e) { const f = e.target.files && e.target.files[0]; if (f) handleFile(f); };
  const paste = document.getElementById("paste");
  if (paste) paste.oninput = function () {
    const n = applyParsed(parseLooseNumbers(paste.value));
    const box = document.getElementById("ocr-status");
    if (n && box) box.textContent = "Picked " + n + " value(s) from pasted text. Confirm before recommending.";
  };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(function () {});
  try { if (window.initCase) initCase(); } catch (e) {}
}
