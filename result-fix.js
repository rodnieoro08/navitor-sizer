function rangeOk(v, r) {
  return v != null && Array.isArray(r) && v >= r[0] && v <= r[1];
}
function inRange(v, r) {
  return rangeOk(v, r);
}

function evaluateSize(s, d) {
  const flags = [];
  const hard = [];
  let score = 0;
  let matches = 0;
  let available = 0;
  const periC = centrality(d.peri, s.peri);
  const areaC = centrality(d.area, s.area);
  const meanC = centrality(d.meanD, s.meanD);

  if (d.peri != null) {
    available++;
    if (rangeOk(d.peri, s.peri)) { matches++; score += 0.45 * Math.max(0.15, periC); }
    else { score += 0.15 * periC; flags.push("Perimeter " + d.peri + " mm is outside " + s.size + " mm range " + s.peri[0] + "\u2013" + s.peri[1]); }
  }
  if (d.area != null) {
    available++;
    if (rangeOk(d.area, s.area)) { matches++; score += 0.35 * Math.max(0.15, areaC); }
    else { score += 0.12 * areaC; flags.push("Area " + d.area + " mm\u00b2 is outside " + s.size + " mm range " + s.area[0] + "\u2013" + s.area[1]); }
  }
  if (d.meanD != null) {
    available++;
    if (rangeOk(d.meanD, s.meanD)) { matches++; score += 0.20 * Math.max(0.15, meanC); }
    else { score += 0.08 * meanC; flags.push("Mean diameter " + d.meanD + " mm is outside labelled use " + s.meanD[0] + "\u2013" + s.meanD[1]); }
  }

  if (d.sovW != null && d.sovW < s.sovW) {
    hard.push("SOV width " + d.sovW + " mm < " + s.sovW + " mm required for " + s.size + " mm");
  }
  if (d.sovH != null && d.sovH < s.sovH) {
    hard.push("SOV height " + d.sovH + " mm < " + s.sovH + " mm required");
  }
  if (d.aa != null && !rangeOk(d.aa, s.aa)) {
    hard.push("Ascending aorta " + d.aa + " mm outside " + s.aa[0] + "\u2013" + s.aa[1] + " mm for " + s.size + " mm");
  }
  const cors = [d.lca, d.rca].filter((x) => x != null);
  if (cors.length && Math.min.apply(null, cors) < 10) {
    hard.push("Coronary height " + Math.min.apply(null, cors) + " mm is below the 10 mm minimum");
  }
  if (d.access != null && d.access < s.access) {
    flags.push("Access " + d.access + " mm < FlexNav minimum " + s.access.toFixed(1) + " mm for this size");
    score -= 0.2;
  }
  if (d.sovW != null && d.sovW >= s.sovW && d.sovW < s.sovW + 2) {
    flags.push("SOV width only " + (d.sovW - s.sovW).toFixed(1) + " mm above the " + s.size + " mm floor");
    score -= 0.18;
  }
  if (d.stj != null && d.stj < s.size) {
    flags.push("STJ " + d.stj + " mm is smaller than " + s.size + " mm labelled diameter");
    score -= 0.15;
  }
  const ell = ellipticity(d);
  if (ell != null && ell < 0.73) {
    flags.push("Ellipticity " + ell.toFixed(2) + " < 0.73 (IFU circular/elliptical note)");
    score -= 0.15;
  }
  if (d.lvot != null && d.meanD != null && d.lvot + 1.5 < d.meanD) {
    flags.push("LVOT " + d.lvot + " mm smaller than annulus mean " + d.meanD + " mm");
    score -= 0.08;
  }
  const calcPenalty = { none: 0, mild: 0.02, moderate: 0.1, severe: 0.22, unknown: 0 };
  if (d.calcStj === "moderate" || d.calcStj === "severe") {
    flags.push("STJ calcium " + d.calcStj + " \u2014 caution upsizing");
    score -= calcPenalty[d.calcStj];
  }
  if (d.calcLvot === "severe") {
    flags.push("Severe LVOT calcium \u2014 conduction / anchoring review");
    score -= 0.1;
  }
  if (d.calcAnn === "severe") {
    flags.push("Severe annular calcium \u2014 PVL and rupture review if oversized");
    score -= 0.08;
  }

  const eligible = hard.length === 0 && matches >= 1;
  return { size: s, score, matches, available, flags, hard, eligible, periC, areaC, meanC };
}

function recommend(d) {
  const checks = consistencyFlags(d);
  if (d.peri == null && d.area == null && d.meanD == null) {
    return { error: "Enter at least perimeter, area, or mean annulus diameter." };
  }
  const evals = SIZES.map((s) => evaluateSize(s, d));
  const eligible = evals.filter((e) => e.eligible).sort((a, b) => b.score - a.score);
  const nearest = [...evals].sort((a, b) => b.score - a.score);
  const boundary = isBoundary(d.peri);
  if (!eligible.length) {
    return { d, checks, evals, eligible: [], nearest, primary: null, coPrimary: null, confidence: "low", boundary };
  }
  const best = eligible[0];
  let coPrimary = null;
  if (eligible[1] && Math.abs(best.score - eligible[1].score) < 0.08) coPrimary = eligible[1];
  let confidence = "high";
  if (best.matches < 2 || best.flags.length >= 2 || coPrimary || boundary) confidence = "mod";
  if (best.matches === 1 && best.available >= 2) confidence = "mod";
  if (checks.length) confidence = confidence === "high" ? "mod" : confidence;
  return { d, checks, evals, eligible, nearest, primary: best, coPrimary, confidence, boundary };
}
