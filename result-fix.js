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
    else { score += 0.15 * periC; flags.push("Perimeter " + d.peri + " mm is outside " + s.size + " mm IFU " + s.peri[0] + "\u2013" + s.peri[1]); }
  }
  if (d.area != null) {
    available++;
    if (rangeOk(d.area, s.area)) { matches++; score += 0.35 * Math.max(0.15, areaC); }
    else { score += 0.12 * areaC; flags.push("Area " + d.area + " mm\u00b2 is outside " + s.size + " mm IFU " + s.area[0] + "\u2013" + s.area[1]); }
  }
  if (d.meanD != null) {
    available++;
    if (rangeOk(d.meanD, s.meanD)) { matches++; score += 0.20 * Math.max(0.15, meanC); }
    else { score += 0.08 * meanC; flags.push("Mean diameter " + d.meanD + " mm is outside " + s.size + " mm IFU " + s.meanD[0] + "\u2013" + s.meanD[1]); }
  }

  if (d.sovW != null && d.sovW < s.sovW) {
    hard.push("SOV width " + d.sovW + " mm < " + s.sovW + " mm required for " + s.size + " mm");
  }
  if (d.sovH != null && d.sovH < s.sovH) {
    hard.push("SOV height " + d.sovH + " mm < " + s.sovH + " mm required");
  }
  if (d.aa != null && !rangeOk(d.aa, s.aa)) {
    flags.push("Ascending aorta " + d.aa + " mm outside chart " + s.aa[0] + "\u2013" + s.aa[1] + " mm for " + s.size + " mm");
    score -= 0.08;
  }
  if (d.access != null && d.access < s.access) {
    flags.push("Access " + d.access + " mm < FlexNav minimum " + s.access.toFixed(1) + " mm for this size");
    score -= 0.2;
  }
  const minCor = [d.lca, d.rca].filter((x) => x != null);
  if (minCor.length) {
    const mc = Math.min.apply(null, minCor);
    if (mc < 10) {
      flags.push("Low coronary height " + mc + " mm — obstruction risk; do not upsize");
      score -= 0.35;
    } else if (mc < 12) {
      flags.push("Borderline coronary height " + mc + " mm — review leaflet calcium and SOV");
      score -= 0.15;
    }
  }
  if (d.stj != null && d.stj < s.size) {
    flags.push("STJ " + d.stj + " mm is smaller than " + s.size + " mm labelled diameter");
    score -= 0.1;
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
  if (boundary || coPrimary) confidence = "mod";
  if (best.flags.length >= 2) confidence = "mod";
  if (best.hard.length) confidence = "low";
  if (best.matches >= 2 && best.hard.length === 0 && best.flags.length === 0 && !boundary) confidence = "high";
  return { d, checks, evals, eligible, nearest, primary: best, coPrimary, confidence, boundary };
}
