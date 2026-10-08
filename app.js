const SIZES = [
  {
    size: 23, meanD: [19, 21], area: [277, 346], peri: [60, 66],
    aa: [26, 36], sovW: 25, access: 5.0,
    inflow: 23, outflow: 23, stentD: 41, commH: 21, halfCell: 7, cuff: 9, stentH: 47
  },
  {
    size: 25, meanD: [21, 23], area: [338, 415], peri: [66, 73],
    aa: [28, 38], sovW: 27, access: 5.0,
    inflow: 25, outflow: 25, stentD: 43, commH: 23, halfCell: 7, cuff: 9, stentH: 48
  },
  {
    size: 27, meanD: [23, 25], area: [405, 491], peri: [72, 79],
    aa: [30, 40], sovW: 29, access: 5.5,
    inflow: 27, outflow: 27, stentD: 44, commH: 24, halfCell: 8, cuff: 10, stentH: 48
  },
  {
    size: 29, meanD: [25, 27], area: [479, 573], peri: [79, 85],
    aa: [32, 42], sovW: 31, access: 5.5,
    inflow: 29, outflow: 29, stentD: 46, commH: 25, halfCell: 8, cuff: 10, stentH: 48
  },
  {
    size: 35, meanD: [27, 30], area: [559, 707], peri: [85, 95],
    aa: [27, 44], sovW: 34, access: 5.5,
    inflow: 35, outflow: 35, stentD: 48, commH: 27, halfCell: 9, cuff: 11, stentH: 47
  }
];

const $ = (id) => document.getElementById(id);
const num = (id) => {
  const el = document.getElementById(id);
  if (!el) return null; // e.g. the SOV height field no longer exists
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : null;
};

function inRange(v, r) {
  return v != null && Array.isArray(r) && v >= r[0] && v <= r[1];
}
function mid(r) { return (r[0] + r[1]) / 2; }
function half(r) { return (r[1] - r[0]) / 2 || 1; }
function centrality(v, r) {
  if (v == null) return null;
  if (v < r[0] || v > r[1]) return -Math.min(1.2, Math.abs(v - (v < r[0] ? r[0] : r[1])) / Math.max(1, half(r)));
  return 1 - Math.abs(v - mid(r)) / half(r);
}

function derivedFromPeri(p) { return p / Math.PI; }
function derivedFromArea(a) { return 2 * Math.sqrt(a / Math.PI); }

function gather() {
  const sovL = num("sovL"), sovR = num("sovR"), sovNC = num("sovNC");
  const sovs = [sovL, sovR, sovNC].filter((x) => x != null);
  const calc = (id) => {
    const el = document.getElementById(id);
    return (el && el.dataset && el.dataset.v) || "unknown";
  };
  const notes = document.getElementById("notes");
  return {
    peri: num("peri"), area: num("area"), periPD: num("periPD"),
    meanD: num("meanD"), minD: num("minD"), maxD: num("maxD"),
    stj: num("stj"),
    sovW: sovs.length ? Math.min.apply(null, sovs) : num("sovMin"),
    sovL, sovR, sovNC,
    lca: num("lca"), rca: num("rca"), lvot: num("lvot"),
    aa: num("aa"), access: num("access"),
    calcAnn: calc("calcAnn"), calcLvot: calc("calcLvot"), calcStj: calc("calcStj"), calcCusp: calc("calcCusp"),
    eccLeaf: isOn("tEccLeaf"), protLvot: isOn("tProtLvot"), condRisk: isOn("tCond"), ppm: isOn("tPpm"),
    notes: notes ? notes.value.trim() : ""
  };
}

function ellipticity(d) {
  if (d.minD != null && d.maxD != null && d.maxD > 0) return d.minD / d.maxD;
  return null;
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
  const periOk = d.peri != null && inRange(d.peri, s.peri);
  const pdOk = pd != null && inRange(+pd.toFixed(1), s.meanD);
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
  if (periOk && d.area != null && !inRange(d.area, s.area)) {
    flags.push("Area " + d.area + " mm\u00b2 is outside the reference band " + s.area[0] + "\u2013" + s.area[1] + ". It does not change the perimeter decision.");
  }
  if (periOk && d.meanD != null && !inRange(d.meanD, s.meanD)) {
    flags.push("Entered mean diameter " + d.meanD + " mm disagrees with the perimeter-derived diameter. Perimeter decides.");
  }
  if (d.sovW != null && d.sovW < s.sovW) hard.push("SOV width " + d.sovW + " mm < " + s.sovW + " mm required for " + s.size + " mm");
  if (d.aa != null && !inRange(d.aa, s.aa)) hard.push("Ascending aorta " + d.aa + " mm outside " + s.aa[0] + "\u2013" + s.aa[1] + " mm for " + s.size + " mm");
  const cors = [d.lca, d.rca].filter((x) => x != null);
  if (cors.length && Math.min.apply(null, cors) < 10) hard.push("Coronary height " + Math.min.apply(null, cors) + " mm is below the 10 mm minimum");
  if (d.access != null && d.access < s.access) { flags.push("Access " + d.access + " mm < FlexNav minimum " + s.access.toFixed(1) + " mm for this size"); score -= 0.2; }
  if (d.sovW != null && d.sovW >= s.sovW && d.sovW < s.sovW + 2) { flags.push("SOV width only " + (d.sovW - s.sovW).toFixed(1) + " mm above the " + s.sovW + " mm floor"); score -= 0.18; }
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

function consistencyFlags(d) {
  const out = [];
  if (d.peri != null && d.area != null) {
    const dp = derivedFromPeri(d.peri);
    const da = derivedFromArea(d.area);
    if (Math.abs(dp - da) > 2.0) {
      out.push(`Perimeter-derived Ø ${dp.toFixed(1)} mm vs area-derived Ø ${da.toFixed(1)} mm differ by >2 mm — recheck 3mensio tracing`);
    }
  }
  if (d.peri != null && d.meanD != null) {
    const dp = derivedFromPeri(d.peri);
    if (Math.abs(dp - d.meanD) > 2.0) {
      out.push(`Perimeter-derived Ø ${dp.toFixed(1)} mm vs entered mean Ø ${d.meanD} mm differ by >2 mm`);
    }
  }
  if (d.minD != null && d.maxD != null && d.meanD != null) {
    const arith = (d.minD + d.maxD) / 2;
    if (Math.abs(arith - d.meanD) > 1.5) {
      out.push(`(Min+Max)/2 = ${arith.toFixed(1)} mm vs mean Ø ${d.meanD} mm`);
    }
  }
  return out;
}

// ---- Optional toggles (Access & calcium card) ----
const TOGGLES = ["tEccLeaf", "tProtLvot", "tCond", "tPpm"];
function isOn(id) {
  const el = document.getElementById(id);
  return !!(el && el.classList.contains("on"));
}
function setToggle(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("on", !!on);
  el.setAttribute("aria-pressed", on ? "true" : "false");
}
function resetToggles() { TOGGLES.forEach((id) => setToggle(id, false)); }

function recommend(d) {
  return recommendField(d);
}

function recommendClassic(d) {
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

// ---- Field logic at shared edges ----
// Single-size perimeters use the base pick path below. When the perimeter sits inside two neighbouring
// IFU perimeter ranges, the smaller valve is the default and ranked tie-breakers decide whether to step up.
// This is Rodnie's field logic, not an Abbott claim. Heart Team decides.
const CALC_LVL = { none: 0, mild: 1, moderate: 2, severe: 3, unknown: -1 };
const SOV_ROOM = 2;      // mm above the larger size's SOV floor that still counts as "tight"
const SOV_UNIFORM = 2;   // mm: max - min sinus for "genuinely uniform"

function perimeterDerived(d) {
  return d.peri != null ? d.peri / Math.PI : (d.periPD != null ? Number(d.periPD) : null);
}
function coreOk(s, d) {
  const pd = perimeterDerived(d);
  return d.peri != null ? inRange(d.peri, s.peri) : (pd != null && inRange(+pd.toFixed(1), s.meanD));
}
function overlapPair(d) {
  for (let i = 0; i < SIZES.length - 1; i++) {
    if (coreOk(SIZES[i], d) && coreOk(SIZES[i + 1], d)) return { small: SIZES[i], large: SIZES[i + 1] };
  }
  return null;
}

function fieldOverlap(d, evS, evL) {
  const S = evS.size, L = evL.size;
  const pd = perimeterDerived(d);
  const pdR = +pd.toFixed(1);
  const periEq = d.peri != null ? d.peri : pd * Math.PI;
  const over = (s) => (Math.PI * s.size / periEq - 1) * 100;
  const lines = [];
  const add = (title, dir, text) => lines.push({ title: title, dir: dir, text: text });

  // 1. Calcium burden & distribution
  const heavy = [];
  if (CALC_LVL[d.calcCusp] >= 2) heavy.push("cusp " + d.calcCusp);
  if (CALC_LVL[d.calcAnn] >= 2) heavy.push("annular " + d.calcAnn);
  if (d.eccLeaf) heavy.push("eccentric leaflet calcium");
  if (CALC_LVL[d.calcLvot] >= 2 && !d.protLvot) heavy.push("LVOT " + d.calcLvot);
  const calcEntered = [d.calcCusp, d.calcAnn, d.calcLvot].some((v) => v && v !== "unknown") || d.eccLeaf || d.protLvot;
  const calcSupports = heavy.length > 0 && !d.protLvot;
  if (d.protLvot) add("Calcium burden & distribution", "veto larger", "Protruding LVOT calcium: rupture and conduction risk argue against the larger oversize.");
  else if (heavy.length) add("Calcium burden & distribution", "favours larger", "More than mild: " + heavy.join(", ") + ". Supports the " + L.size + ".");
  else if (calcEntered) add("Calcium burden & distribution", "neutral", "None or mild. No calcium reason to step up.");
  else add("Calcium burden & distribution", "not entered", "No calcium grade entered.");

  // 2. Annular area as a check on perimeter
  if (d.area == null) add("Annular area vs perimeter", "not entered", "Area not entered. Circular " + fmtN(periEq, 1) + " mm annulus \u2248 " + fmtN(periEq * periEq / (4 * Math.PI), 1) + " mm\u00b2.");
  else if (d.area < L.area[0]) add("Annular area vs perimeter", "veto larger", "Area " + d.area + " mm\u00b2 is below the " + L.size + " range (" + L.area[0] + "\u2013" + L.area[1] + "). Annulus likely eccentric; perimeter flatters the " + L.size + ".");
  else if (d.area > S.area[1]) add("Annular area vs perimeter", "favours larger", "Area " + d.area + " mm\u00b2 is above the " + S.size + " range (" + S.area[0] + "\u2013" + S.area[1] + "). The " + S.size + " has been left.");
  else add("Annular area vs perimeter", "neutral", "Area " + d.area + " mm\u00b2 sits in both ranges (" + L.area[0] + "\u2013" + S.area[1] + "). Supports either.");

  // 3. SOV diameter (mean, then smallest sinus). SOV height is not used.
  const sovs = [d.sovL, d.sovR, d.sovNC].filter((x) => x != null);
  let sovMean = null, sovMinV = null, sovSpread = null;
  if (sovs.length) {
    sovMean = sovs.reduce((a, b) => a + b, 0) / sovs.length;
    sovMinV = Math.min.apply(null, sovs);
    sovSpread = Math.max.apply(null, sovs) - sovMinV;
  } else if (d.sovW != null) sovMinV = d.sovW;
  const sovEntered = sovMinV != null;
  const floor = L.sovW, tightLim = floor + SOV_ROOM;
  const uniform = sovs.length === 3 && sovSpread <= SOV_UNIFORM;
  const sovVeto = sovEntered && sovMinV < floor;
  const sovTight = !sovEntered || sovMinV < tightLim || (sovMean != null && sovMean < tightLim);
  let sovDesc = sovs.length ? "Mean " + fmtN(sovMean, 1) + " mm, smallest " + fmtN(sovMinV, 1) + " mm." : sovEntered ? "SOV min width only, " + fmtN(sovMinV, 1) + " mm. Uniformity cannot be confirmed." : "";
  let uniDesc = sovs.length === 3 ? (uniform ? " All three within " + SOV_UNIFORM + " mm." : " Sinuses differ by " + fmtN(sovSpread, 1) + " mm, so not uniform. A single narrow sinus keeps the " + S.size + ".") : sovs.length ? " Not all three sinuses entered." : "";
  if (!sovEntered) add("SOV diameter", "not entered", "SOV not entered. The root is not confirmed for the " + L.size + ", so the " + S.size + " stays.");
  else if (sovVeto) add("SOV diameter", "veto larger", sovDesc + " Smallest sinus is below the " + floor + " mm floor for the " + L.size + " (hard exclude).");
  else if (sovTight) add("SOV diameter", "favours smaller", sovDesc + " Tight for the " + L.size + " (below " + tightLim + " mm; the frame is built larger than its label)." + uniDesc);
  else add("SOV diameter", "neutral", sovDesc + " Roomy for the " + L.size + " (\u2265 " + tightLim + " mm). No SOV veto.");

  // 4. LVOT vs annulus
  const lvotSmall = d.lvot != null && d.lvot < pdR;
  if (d.lvot == null) add("LVOT vs annulus", "not entered", "LVOT not entered.");
  else if (lvotSmall) add("LVOT vs annulus", "favours smaller", "LVOT " + d.lvot + " mm < annulus " + pdR.toFixed(1) + " mm (perimeter-derived). Constrains the " + L.size + " inflow.");
  else add("LVOT vs annulus", "neutral", "LVOT " + d.lvot + " mm \u2265 annulus " + pdR.toFixed(1) + " mm. No inflow constraint.");

  // 5. Coronary height & STJ
  const otherHardL = evL.hard.filter((h) => !/^SOV width/.test(h));
  const cors = [d.lca, d.rca].filter((x) => x != null);
  const corTxt = [];
  let corDir = "not entered";
  if (otherHardL.length) { corDir = "veto larger"; corTxt.push(L.size + " excluded: " + otherHardL.join("; ") + "."); }
  if (!evS.eligible && evS.hard.length) corTxt.push(S.size + " excluded: " + evS.hard.join("; ") + ".");
  if (d.stj != null) {
    if (d.stj < L.size) { if (corDir !== "veto larger") corDir = "favours smaller"; corTxt.push("STJ " + d.stj + " mm < " + L.size + " mm label."); }
    else { if (corDir === "not entered") corDir = "neutral"; corTxt.push("STJ " + d.stj + " mm \u2265 " + L.size + " mm label."); }
  }
  if (cors.length) {
    const mn = Math.min.apply(null, cors);
    if (mn >= 10) { if (corDir === "not entered") corDir = "neutral"; corTxt.push("Lowest coronary " + mn + " mm \u2265 10 mm."); }
    else if (!otherHardL.length) corTxt.push("Lowest coronary " + mn + " mm < 10 mm.");
  }
  if (!corTxt.length) corTxt.push("STJ and coronary heights not entered.");
  add("Coronary height & STJ", corDir, corTxt.join(" "));

  // 6. Conduction risk vs PPM
  const anyVetoSoFar = lines.some((l) => l.dir === "veto larger") || !evL.eligible;
  const rootTakes = !anyVetoSoFar && sovEntered && !sovTight;
  if (d.condRisk) add("Conduction risk vs PPM", "favours smaller", "RBBB / short membranous septum / heavy septal calcium: favours the " + S.size + " and a higher implant." + (d.ppm ? " PPM concern noted but conduction risk wins." : ""));
  else if (d.ppm && rootTakes) add("Conduction risk vs PPM", "favours larger", "Small patient / low expected EOA, and the root can take the " + L.size + ".");
  else if (d.ppm) add("Conduction risk vs PPM", "neutral", "PPM concern noted, but the root cannot take the " + L.size + " (SOV tight, not entered, or a veto).");
  else add("Conduction risk vs PPM", "not entered", "No conduction or PPM concern entered.");

  // Decision
  const veto = anyVetoSoFar;
  let choice = "small", why;
  if (veto) {
    why = "Veto on the " + L.size + ": " + lines.filter((l) => l.dir === "veto larger").map((l) => l.title).concat(!evL.eligible && !lines.some((l) => l.dir === "veto larger") ? ["hard exclude"] : []).join(", ") + ".";
  } else if (sovTight) {
    const miss = [];
    if (!calcSupports) miss.push(calcEntered ? "calcium not more than mild" : "calcium not entered");
    if (d.area == null) miss.push("area not entered");
    else if (d.area < L.area[0]) miss.push("area below " + L.area[0]);
    if (d.lvot == null) miss.push("LVOT not entered");
    else if (lvotSmall) miss.push("LVOT smaller than annulus");
    if (!uniform) miss.push(sovs.length === 3 ? "sinuses not uniform" : "uniform sinuses not confirmed (need all three)");
    if (d.condRisk) miss.push("conduction risk");
    if (!miss.length) { choice = "large"; why = "SOV is tight for the " + L.size + ", but calcium is more than mild, area \u2265 " + L.area[0] + ", LVOT \u2265 annulus, and all three sinuses are uniform."; }
    else why = (sovEntered ? "SOV is tight for the " + L.size + ". " : "") + "Not stepping up: " + miss.join("; ") + ".";
  } else {
    const reasons = [];
    if (calcSupports) reasons.push("calcium more than mild");
    if (d.area != null && d.area > S.area[1]) reasons.push("area above the " + S.size + " range");
    if (d.ppm) reasons.push("PPM concern");
    const blocks = [];
    if (lvotSmall) blocks.push("LVOT smaller than annulus");
    if (d.condRisk) blocks.push("conduction risk");
    if (reasons.length && !blocks.length) { choice = "large"; why = "SOV is roomy for the " + L.size + " and " + reasons.join(", ") + "."; }
    else if (!reasons.length) why = "SOV is roomy, but nothing argues for the " + L.size + " (calcium, area or PPM).";
    else why = "Would step up (" + reasons.join(", ") + "), but blocked: " + blocks.join(", ") + ".";
  }
  if (choice === "large" && !evL.eligible) choice = "small";
  let flag = "Shared edge " + S.size + "/" + L.size + ": " + (choice === "large" ? "stepped up to " + L.size : "default " + S.size + (evL.eligible ? "" : " (" + L.size + " excluded)"));
  let tag = choice === "large" ? "stepped up" : "default";
  if (!evS.eligible && evL.eligible) {
    choice = "large"; tag = "only option";
    flag = "Shared edge " + S.size + "/" + L.size + ": " + S.size + " excluded, " + L.size + " only";
    why = "The " + S.size + " fails a hard limit, so the " + L.size + " is the only option at this edge.";
  }
  const chosen = choice === "large" ? L : S;
  let stjAlert = null;
  if (choice === "large" && d.stj != null && d.stj < L.size) {
    stjAlert = "STJ " + d.stj + " mm is smaller than the " + L.size + " mm label. It does not stop the step-up, but check the STJ before choosing the " + L.size + ".";
    why += " Alert: " + stjAlert;
  }
  return {
    small: S.size, large: L.size, choice: chosen.size, stepped: tag === "stepped up", tag: tag,
    pd: pdR, periEq: periEq, circArea: periEq * periEq / (4 * Math.PI),
    oversize: [{ size: S.size, pct: over(S) }, { size: L.size, pct: over(L) }],
    lines: lines, why: why, flag: flag, stjAlert: stjAlert
  };
}

function fmtN(v, dp) { return (Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp)).toFixed(dp); }

function recommendField(d) {
  const r = recommendClassic(d);
  if (r.error || !r.primary) return Object.assign(r, { logic: "field" });
  const pair = overlapPair(d);
  if (!pair) return Object.assign(r, { logic: "field" });
  const evS = r.evals.find((e) => e.size.size === pair.small.size);
  const evL = r.evals.find((e) => e.size.size === pair.large.size);
  const ov = fieldOverlap(d, evS, evL);
  let primary = r.primary, alternative = null;
  if (evS.eligible && evL.eligible) {
    primary = ov.stepped ? evL : evS;
    alternative = ov.stepped ? evS : evL;
  }
  const eligible = [primary].concat(r.eligible.filter((e) => e !== primary));
  return Object.assign(r, {
    logic: "field", primary: primary, coPrimary: null, alternative: alternative,
    eligible: eligible, confidence: "mod", overlap: ov
  });
}

function isBoundary(p) {
  if (p == null) return null;
  const edges = [
    { p: 66, a: 23, b: 25 },
    { p: 72, a: 25, b: 27 },
    { p: 73, a: 25, b: 27 },
    { p: 79, a: 27, b: 29 },
    { p: 85, a: 29, b: 35 }
  ];
  return edges.find((e) => Math.abs(p - e.p) < 0.05) || (p >= 72 && p <= 73 ? { p: "72–73", a: 25, b: 27 } : null);
}

function setCalc(id, v) {
  const el = $(id);
  el.dataset.v = v;
  [...el.querySelectorAll("button")].forEach((b) => b.classList.toggle("on", b.dataset.v === v));
}

function bindSeg(id) {
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setCalc(id, b.dataset.v);
  });
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + name));
  document.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.screen === name));
  window.scrollTo({ top: 0, behavior: "instant" });
}

function fmt(v, u = "") {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v}${u}`;
}

function renderResult(r) {
  const box = $("result-body");
  if (r.error) {
    box.innerHTML = `<div class="empty">${r.error}</div>`;
    return;
  }

  const d = r.d;
  const ell = ellipticity(d);
  let hero = "";
  if (!r.primary) {
    hero = `
      <div class="result-hero">
        <div class="k">No size fully meets IFU constraints</div>
        <div class="size" style="font-size:28px">Review anatomy</div>
        <div class="also">Nearest scored sizes shown below. Do not implant off-label from this tool.</div>
        <div class="conf low">Low confidence</div>
      </div>`;
  } else if (r.overlap && r.alternative) {
    hero = `
      <div class="result-hero">
        <div class="k">Primary recommendation</div>
        <div class="size">${r.primary.size.size} mm</div>
        <div class="also">Alternative: ${r.alternative.size.size} mm · ${r.overlap.flag}</div>
        <div class="conf mod">Moderate confidence</div>
      </div>`;
  } else if (r.coPrimary) {
    hero = `
      <div class="result-hero">
        <div class="k">Co-primary — Heart Team choice</div>
        <div class="size">${r.primary.size.size} or ${r.coPrimary.size.size} mm</div>
        <div class="also">${r.boundary ? `Perimeter sits on the ${r.boundary.p} mm boundary between ${r.boundary.a} and ${r.boundary.b} mm.` : "Scores within 0.08 — do not force a single size."}</div>
        <div class="conf mod">Borderline</div>
      </div>`;
  } else {
    const also = r.eligible.filter((e) => e.size.size !== r.primary.size.size).map((e) => e.size.size + " mm");
    hero = `
      <div class="result-hero">
        <div class="k">Primary recommendation</div>
        <div class="size">${r.primary.size.size} mm</div>
        <div class="also">${also.length ? "Also compatible: " + also.join(", ") : "No second size fully compatible"}</div>
        <div class="conf ${r.confidence}">${r.confidence === "high" ? "High" : r.confidence === "mod" ? "Moderate" : "Low"} confidence</div>
      </div>`;
  }

  const why = [];
  if (d.peri != null) why.push(["Perimeter", `${d.peri} mm`]);
  if (d.area != null) why.push(["Area", `${d.area} mm²`]);
  if (d.meanD != null) why.push(["Mean diameter", `${d.meanD} mm`]);
  if (d.minD != null && d.maxD != null) why.push(["Min / max Ø", `${d.minD} / ${d.maxD} mm`]);
  if (ell != null) why.push(["Ellipticity (min/max)", ell.toFixed(2) + (ell < 0.73 ? " ⚠" : " ✓")]);
  if (d.stj != null) why.push(["STJ", `${d.stj} mm`]);
  if (d.sovW != null) why.push(["SOV min width", `${d.sovW} mm`]);
  if (d.lca != null || d.rca != null) why.push(["LCA / RCA height", `${fmt(d.lca)} / ${fmt(d.rca)} mm`]);
  if (d.lvot != null) why.push(["LVOT", `${d.lvot} mm`]);
  if (d.aa != null) why.push(["Ascending aorta", `${d.aa} mm`]);
  if (d.access != null) why.push(["Access min Ø", `${d.access} mm`]);

  const whyHtml = why.map(([k, v]) => `<div class="why-row"><span>${k}</span><span>${v}</span></div>`).join("");

  const flagHtml = [
    ...(r.overlap ? [`<div class="flag warn"><b>Field logic</b>${r.overlap.flag}</div>`] : []),
    ...(r.overlap && r.overlap.stjAlert ? [`<div class="flag warn"><b>STJ alert</b>${r.overlap.stjAlert}</div>`] : []),
    ...r.checks.map((f) => `<div class="flag warn"><b>Measurement check</b>${f}</div>`),
    ...(r.primary ? r.primary.hard.map((f) => `<div class="flag bad"><b>Hard constraint</b>${f}</div>`) : []),
    ...(r.primary ? r.primary.flags.filter((f) => !(r.overlap && r.overlap.stjAlert && /^STJ .* labelled diameter$/.test(f))).map((f) => `<div class="flag warn"><b>Review</b>${f}</div>`) : []),
    ...(!r.primary ? r.nearest.slice(0, 3).flatMap((e) => e.hard.map((f) => `<div class="flag bad"><b>${e.size.size} mm</b>${f}</div>`)) : [])
  ].join("");

  const rows = SIZES.map((s) => {
    const ev = r.evals.find((e) => e.size.size === s.size);
    const cls = ev.eligible ? "hl" : "";
    const mark = ev.eligible ? (r.primary && r.primary.size.size === s.size ? "●" : "○") : "—";
    const periOk = inRange(d.peri, s.peri) ? "Y" : d.peri == null ? "·" : "N";
    const areaOk = inRange(d.area, s.area) ? "Y" : d.area == null ? "·" : "N";
    const meanOk = inRange(d.meanD, s.meanD) ? "Y" : d.meanD == null ? "·" : "N";
    const sovOk = d.sovW == null ? "·" : d.sovW >= s.sovW ? "Y" : "N";
    return `<tr class="${cls}"><td>${mark} ${s.size}</td><td class="num">${periOk}</td><td class="num">${areaOk}</td><td class="num">${meanOk}</td><td class="num">${sovOk}</td><td class="num">${ev.score.toFixed(2)}</td></tr>`;
  }).join("");

  let overlapHtml = "";
  if (r.overlap) {
    const o = r.overlap;
    const dirCls = { "favours smaller": "d-s", "favours larger": "d-l", "neutral": "d-n", "veto larger": "d-v", "not entered": "d-x" };
    overlapHtml = `
      <div class="card overlap">
        <h2>Overlap explanation</h2>
        <p class="hint">Perimeter ${fmtN(o.periEq, 1)} mm sits in both ${o.small} and ${o.large} mm ranges. Perimeter-derived Ø ${o.pd.toFixed(1)} mm · circular annulus ≈ ${fmtN(o.circArea, 1)} mm² · oversizing ${o.oversize.map((x) => x.size + " ≈ " + fmtN(x.pct, 1) + "%").join(" · ")}. Default is the smaller valve.</p>
        <ol class="ov">${o.lines.map((l) => `<li><b>${l.title}</b> <span class="dir ${dirCls[l.dir]}">${l.dir}</span><div>${l.text}</div></li>`).join("")}</ol>
        <div class="flag ${o.stepped ? "warn" : "ok"}"><b>${o.choice} mm (${o.tag})</b>${o.why}</div>
      </div>`;
  }

  let compare = "";
  if (r.primary && (r.coPrimary || r.eligible.length > 1)) {
    const a = r.primary.size;
    const b = (r.alternative || r.coPrimary || r.eligible[1]).size;
    compare = `
      <div class="card">
        <h2>Side-by-side</h2>
        <div class="compare">
          <div class="mini"><div class="t">Candidate</div><div class="v">${a.size}</div><div class="s">Peri ${a.peri[0]}–${a.peri[1]} · SOV ≥${a.sovW} · Access ≥${a.access}</div></div>
          <div class="mini"><div class="t">Candidate</div><div class="v">${b.size}</div><div class="s">Peri ${b.peri[0]}–${b.peri[1]} · SOV ≥${b.sovW} · Access ≥${b.access}</div></div>
        </div>
      </div>`;
  }

  box.innerHTML = `
    ${hero}
    <div class="card"><h2>Entered anatomy</h2>${whyHtml || '<div class="hint">No extra fields</div>'}</div>
    ${flagHtml ? `<div class="card"><h2>Flags</h2>${flagHtml}</div>` : `<div class="flag ok"><b>No extra review flags</b>Core ranges align and soft modifiers are quiet.</div>`}
    ${overlapHtml}
    ${compare}
    <div class="card">
      <h2>Fit matrix</h2>
      <div class="hint">Y in range · N out · · not entered · score is relative</div>
      <table>
        <thead><tr><th>Size</th><th>Peri</th><th>Area</th><th>MeanØ</th><th>SOV</th><th>Score</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="disclaimer">Decision support only for trained Navitor specialists. Not a medical device. IFU, full CT and Heart Team override this output. © chart values from Abbott Navitor Vision didactic TRN1006420 OUS VER A / published use ranges.</p>
  `;
}

function loadExample(kind) {
  const set = (id, v) => { $(id).value = v ?? ""; };
  if (kind === "clear") {
    ["peri","area","meanD","minD","maxD","stj","sovMin","sovL","sovR","sovNC","lca","rca","lvot","aa","access","notes"].forEach((id) => set(id, ""));
    setCalc("calcAnn", "unknown"); setCalc("calcLvot", "unknown"); setCalc("calcStj", "unknown"); setCalc("calcCusp", "unknown");
    resetToggles();
    return;
  }
  try { setCalc("calcCusp", "unknown"); resetToggles(); } catch (e) {}
  if (kind === "mid27") {
    set("peri", 75.2); set("area", 448); set("meanD", 24.1); set("minD", 21.8); set("maxD", 26.5);
    set("stj", 29.4); set("sovL", 32.1); set("sovR", 31.0); set("sovNC", 33.4);
    set("lca", 13.6); set("rca", 16.1); set("lvot", 23.4); set("aa", 34.0); set("access", 6.2);
    setCalc("calcAnn", "mild"); setCalc("calcLvot", "none"); setCalc("calcStj", "none");
  }
  if (kind === "edge66") {
    set("peri", 66.0); set("area", 340); set("meanD", 21.0); set("minD", 18.6); set("maxD", 23.8);
    set("stj", 26.2); set("sovL", 27.4); set("sovR", 26.8); set("sovNC", 28.1);
    set("lca", 11.2); set("rca", 14.0); set("lvot", 20.1); set("aa", 30.0); set("access", 5.4);
    setCalc("calcAnn", "moderate"); setCalc("calcLvot", "mild"); setCalc("calcStj", "moderate");
  }
  if (kind === "edge79") {
    set("peri", 79.0); set("area", 500); set("meanD", 25.2); set("minD", 23.1); set("maxD", 27.4);
    set("stj", 31.8); set("sovL", 33.0); set("sovR", 31.2); set("sovNC", 34.5);
    set("lca", 14.8); set("rca", 17.2); set("lvot", 24.8); set("aa", 36.5); set("access", 6.8);
    setCalc("calcAnn", "mild"); setCalc("calcLvot", "none"); setCalc("calcStj", "none");
  }
  const peri = document.getElementById("peri");
  if (peri) peri.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderCharts() {
  const body = SIZES.map((s) => `
    <tr>
      <td><b>${s.size}</b></td>
      <td class="num">${s.meanD[0]}–${s.meanD[1]}</td>
      <td class="num">${s.area[0]}–${s.area[1]}</td>
      <td class="num">${s.peri[0]}–${s.peri[1]}</td>
      <td class="num">${s.aa[0]}–${s.aa[1]}</td>
      <td class="num">≥${s.sovW}</td>
      <td class="num">≥${s.access.toFixed(1)}</td>
    </tr>`).join("");
  $("chart-ifus").innerHTML = body;

  const dim = SIZES.map((s) => `
    <tr>
      <td><b>${s.size}</b></td>
      <td class="num">${s.inflow}</td>
      <td class="num">${s.outflow}</td>
      <td class="num">${s.stentD}</td>
      <td class="num">${s.commH}</td>
      <td class="num">${s.halfCell}</td>
      <td class="num">${s.cuff}</td>
      <td class="num">${s.stentH}</td>
    </tr>`).join("");
  $("chart-dims").innerHTML = dim;
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
  // Result-tab decoration (formerly fit-color.js): derived-diameter row + fit-matrix colours
  if (window.__lastRec) {
    showDerivedDiameter(window.__lastRec);
    colorFitMatrix(window.__lastRec);
  }
}


function colorFitMatrix(r) {
  if (!document.getElementById("fit-colors")) {
    var st = document.createElement("style");
    st.id = "fit-colors";
    st.textContent = "#result-body tr.fit-green{background:rgba(61,214,140,.28)}#result-body tr.fit-green td{color:#e7fff3;font-weight:700}#result-body tr.fit-yellow{background:rgba(240,180,41,.30)}#result-body tr.fit-yellow td{color:#fff4d2;font-weight:700}#result-body tr.fit-red{background:rgba(255,107,122,.18)}#result-body tr.fit-red td{color:#ffd0d6}";
    document.head.appendChild(st);
  }
  var table = document.querySelector("#result-body table");
  if (!table || !r || !r.evals) return;
  var rows = table.querySelectorAll("tbody tr");
  var eligible = r.evals.filter(function (e) { return e.eligible; }).sort(function (a, b) { return b.score - a.score; });
  var ranked = r.evals.slice().sort(function (a, b) { return b.score - a.score; });
  var both = eligible.length >= 2;
  var green = !both && eligible.length ? eligible[0].size.size : null;
  var yellow = {};
  if (both) {
    yellow[eligible[0].size.size] = 1;
    yellow[eligible[1].size.size] = 1;
  } else {
    var second = null;
    for (var i = 0; i < ranked.length; i++) {
      if (ranked[i].size.size !== green) { second = ranked[i]; break; }
    }
    if (second) yellow[second.size.size] = 1;
  }
  rows.forEach(function (tr) {
    var size = parseInt(tr.cells[0].textContent.replace(/[^0-9]/g, ""), 10);
    tr.classList.remove("fit-green", "fit-yellow", "fit-red", "hl");
    if (yellow[size]) tr.classList.add("fit-yellow");
    else if (size === green) tr.classList.add("fit-green");
    else tr.classList.add("fit-red");
  });
}

function showDerivedDiameter(r) {
  if (!r || !r.d || r.d.peri == null) return;
  var rows = document.querySelectorAll("#result-body .why-row");
  var periRow = null;
  for (var i = 0; i < rows.length; i++) {
    var label = rows[i].querySelector("span");
    if (label && label.textContent.trim() === "Perimeter") periRow = rows[i];
  }
  if (!periRow) return;
  var pd = (r.d.peri / Math.PI).toFixed(1);
  var row = document.createElement("div");
  row.className = "why-row";
  row.innerHTML = "<span>Perimeter-derived diameter</span><span>" + pd + " mm</span>";
  periRow.after(row);
}

// Perimeter-derived diameter field (peri / pi). Creates the field if the page does not have it.
function mountPeriPD() {
  const peri = document.getElementById("peri");
  if (!peri) return;
  if (!document.getElementById("periPD")) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.innerHTML = '<label>Perimeter-derived diameter <span class="unit">mm</span></label>' +
      '<input id="periPD" inputmode="decimal" readonly placeholder="peri ÷ π">';
    const area = document.getElementById("area");
    if (area && area.closest(".field")) area.closest(".field").after(wrap);
    else peri.closest(".field").after(wrap);
  }
  function update() {
    const el = document.getElementById("periPD");
    if (!el) return;
    const p = parseFloat(peri.value);
    el.value = isFinite(p) && p > 0 ? (p / Math.PI).toFixed(1) : "";
    const cPd = document.getElementById("cPd");
    if (cPd && el.value) cPd.value = el.value;
  }
  peri.addEventListener("input", update);
  update();
}

function init() {
  mountPeriPD();
  try { bindSeg("calcAnn"); bindSeg("calcLvot"); bindSeg("calcStj"); bindSeg("calcCusp"); } catch (e) {}
  try { setCalc("calcAnn", "unknown"); setCalc("calcLvot", "unknown"); setCalc("calcStj", "unknown"); setCalc("calcCusp", "unknown"); } catch (e) {}
  try {
    TOGGLES.forEach(function (id) { const el = document.getElementById(id); if (el) el.addEventListener("click", function () { setToggle(id, !isOn(id)); }); });
    resetToggles();
  } catch (e) {}
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

window.navitorRecommend = recommend;
window.navitorGather = gather;
