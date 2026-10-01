function rangeOk(v, r) {
  return v != null && Array.isArray(r) && v >= r[0] && v <= r[1];
}
function inRange(v, r) {
  return rangeOk(v, r);
}

/* IFU ARTMT600362847 Table 2.
   Hard: annulus diameter AND ascending aorta diameter.
   Area and perimeter are reference only.
   Footnote: minor/major axis ratio >= 0.73.
*/
function evaluateSize(s, d) {
  const flags = [];
  const hard = [];
  let score = 0;
  const annulusOk = d.meanD != null && rangeOk(d.meanD, s.meanD);
  const aaOk = d.aa != null && rangeOk(d.aa, s.aa);
  const periOk = d.peri != null && rangeOk(d.peri, s.peri);
  const areaOk = d.area != null && rangeOk(d.area, s.area);

  if (annulusOk) score += 1;
  if (aaOk) score += 0.5;
  if (periOk) score += 0.25;
  if (areaOk) score += 0.2;

  if (annulusOk && d.aa != null && !aaOk) {
    hard.push("Ascending aorta " + d.aa + " mm is outside IFU " + s.aa[0] + "\u2013" + s.aa[1] + " mm for " + s.size + " mm");
  }
  if (annulusOk && d.aa == null) {
    flags.push("Ascending aorta not entered. IFU requires both annulus diameter and ascending aorta diameter.");
  }
  if (annulusOk && d.peri != null && !periOk) {
    flags.push("Perimeter " + d.peri + " mm is outside the reference band " + s.peri[0] + "\u2013" + s.peri[1] + " mm. IFU lists perimeter for reference only.");
  }
  if (annulusOk && d.area != null && !areaOk) {
    flags.push("Area " + d.area + " mm\u00b2 is outside the reference band " + s.area[0] + "\u2013" + s.area[1] + " mm\u00b2. IFU lists area for reference only.");
  }
  if (annulusOk && d.minD != null && d.maxD != null && d.maxD > 0 && (d.minD / d.maxD) < 0.73) {
    flags.push("Annulus min/max ratio " + (d.minD / d.maxD).toFixed(2) + " is below 0.73 (IFU footnote for annulus diameter).");
  }
  if (annulusOk && d.access != null && d.access < s.access) {
    flags.push("Access " + d.access + " mm is below the FlexNav minimum " + s.access.toFixed(1) + " mm for " + s.size + " mm.");
  }

  const eligible = annulusOk && hard.length === 0;
  const matches = (annulusOk ? 1 : 0) + (aaOk ? 1 : 0) + (periOk ? 1 : 0) + (areaOk ? 1 : 0);
  return {
    size: s, score, matches, available: 4, flags, hard, eligible,
    periC: null, areaC: null, meanC: null
  };
}

function recommend(d) {
  const checks = typeof consistencyFlags === "function" ? consistencyFlags(d) : [];
  if (d.meanD == null && d.peri == null && d.area == null) {
    return { error: "Enter annulus diameter. Perimeter and area are reference only." };
  }
  const evals = SIZES.map((s) => evaluateSize(s, d));
  const eligible = evals.filter((e) => e.eligible).sort((a, b) => b.score - a.score);
  const nearest = [...evals].sort((a, b) => b.score - a.score);
  const boundary = typeof isBoundary === "function" ? isBoundary(d.peri) : null;
  if (!eligible.length) {
    return { d, checks, evals, eligible: [], nearest, primary: null, coPrimary: null, confidence: "low", boundary };
  }
  const best = eligible[0];
  const second = eligible[1] || null;
  let confidence = "high";
  if (second) confidence = "mod";
  if (best.flags.length) confidence = confidence === "high" ? "mod" : confidence;
  if (d.aa == null) confidence = "mod";
  if (d.aa != null && !rangeOk(d.aa, best.size.aa)) confidence = "low";
  return { d, checks, evals, eligible, nearest, primary: best, coPrimary: second, confidence, boundary };
}
