const SIZES = [
  {
    size: 23, meanD: [19, 21], area: [277, 346], peri: [60, 66],
    aa: [26, 36], sovW: 25, sovH: 15, access: 5.0,
    inflow: 23, outflow: 23, stentD: 41, commH: 21, halfCell: 7, cuff: 9, stentH: 47
  },
  {
    size: 25, meanD: [21, 23], area: [338, 415], peri: [66, 73],
    aa: [28, 38], sovW: 27, sovH: 15, access: 5.0,
    inflow: 25, outflow: 25, stentD: 43, commH: 23, halfCell: 7, cuff: 9, stentH: 48
  },
  {
    size: 27, meanD: [23, 25], area: [405, 491], peri: [72, 79],
    aa: [30, 40], sovW: 29, sovH: 15, access: 5.5,
    inflow: 27, outflow: 27, stentD: 44, commH: 24, halfCell: 8, cuff: 10, stentH: 48
  },
  {
    size: 29, meanD: [25, 27], area: [479, 573], peri: [79, 85],
    aa: [32, 42], sovW: 31, sovH: 15, access: 5.5,
    inflow: 29, outflow: 29, stentD: 46, commH: 25, halfCell: 8, cuff: 10, stentH: 48
  },
  {
    size: 35, meanD: [27, 30], area: [559, 707], peri: [85, 95],
    aa: [27, 44], sovW: 34, sovH: 15, access: 5.5,
    inflow: 35, outflow: 35, stentD: 48, commH: 27, halfCell: 9, cuff: 11, stentH: 47
  }
];

const $ = (id) => document.getElementById(id);
const num = (id) => {
  const v = parseFloat($(id).value);
  return Number.isFinite(v) ? v : null;
};

function inRange(v, r) {
  return v != null && v >= r[0] && v <= r[1];
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
  return {
    peri: num("peri"),
    area: num("area"),
    meanD: num("meanD"),
    minD: num("minD"),
    maxD: num("maxD"),
    stj: num("stj"),
    sovW: sovs.length ? Math.min(...sovs) : num("sovMin"),
    sovL, sovR, sovNC,
    sovH: num("sovH"),
    lca: num("lca"),
    rca: num("rca"),
    lvot: num("lvot"),
    aa: num("aa"),
    access: num("access"),
    calcAnn: $("calcAnn").dataset.v || "unknown",
    calcLvot: $("calcLvot").dataset.v || "unknown",
    calcStj: $("calcStj").dataset.v || "unknown",
    notes: $("notes").value.trim()
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

  const periC = centrality(d.peri, s.peri);
  const areaC = centrality(d.area, s.area);
  const meanC = centrality(d.meanD, s.meanD);

  if (d.peri != null) {
    available++;
    if (inRange(d.peri, s.peri)) { matches++; score += 0.45 * Math.max(0.15, periC); }
    else { score += 0.15 * periC; flags.push(`Perimeter ${d.peri} mm is outside ${s.size} mm range ${s.peri[0]}–${s.peri[1]}`); }
  }
  if (d.area != null) {
    available++;
    if (inRange(d.area, s.area)) { matches++; score += 0.35 * Math.max(0.15, areaC); }
    else { score += 0.12 * areaC; flags.push(`Area ${d.area} mm² is outside ${s.size} mm range ${s.area[0]}–${s.area[1]}`); }
  }
  if (d.meanD != null) {
    available++;
    if (inRange(d.meanD, s.meanD)) { matches++; score += 0.20 * Math.max(0.15, meanC); }
    else { score += 0.08 * meanC; flags.push(`Mean diameter ${d.meanD} mm is outside labelled use ${s.meanD[0]}–${s.meanD[1]}`); }
  }

  // Hard IFU-style constraints
  if (d.sovW != null && d.sovW < s.sovW) {
    hard.push(`SOV width ${d.sovW} mm < ${s.sovW} mm required for ${s.size} mm`);
  }
  if (d.sovH != null && d.sovH < s.sovH) {
    hard.push(`SOV height ${d.sovH} mm < ${s.sovH} mm required`);
  }
  if (d.aa != null && !inRange(d.aa, s.aa)) {
    hard.push(`Ascending aorta ${d.aa} mm outside ${s.aa[0]}–${s.aa[1]} mm for ${s.size} mm`);
  }
  if (d.access != null && d.access < s.access) {
    flags.push(`Access ${d.access} mm < FlexNav minimum ${s.access.toFixed(1)} mm for this size`);
    score -= 0.2;
  }

  // Soft modifiers used especially on overlaps
  const minCor = [d.lca, d.rca].filter((x) => x != null);
  if (minCor.length) {
    const mc = Math.min(...minCor);
    if (mc < 10) {
      flags.push(`Low coronary height ${mc} mm — obstruction risk; do not upsize`);
      score -= 0.35;
    } else if (mc < 12) {
      flags.push(`Borderline coronary height ${mc} mm — review leaflet calcium and SOV`);
      score -= 0.15;
    }
  }

  if (d.sovW != null && d.sovW >= s.sovW && d.sovW < s.sovW + 2) {
    flags.push(`SOV width only ${ (d.sovW - s.sovW).toFixed(1) } mm above the ${s.size} mm floor`);
    score -= 0.18;
  }

  if (d.stj != null && d.stj < s.size) {
    flags.push(`STJ ${d.stj} mm is smaller than ${s.size} mm labelled diameter`);
    score -= 0.15;
  }

  const ell = ellipticity(d);
  if (ell != null && ell < 0.73) {
    flags.push(`Ellipticity ${ell.toFixed(2)} < 0.73 (IFU circular/elliptical note)`);
    score -= 0.15;
  }

  if (d.lvot != null && d.meanD != null && d.lvot + 1.5 < d.meanD) {
    flags.push(`LVOT ${d.lvot} mm smaller than annulus mean ${d.meanD} mm`);
    score -= 0.08;
  }

  const calcPenalty = { none: 0, mild: 0.02, moderate: 0.1, severe: 0.22, unknown: 0 };
  if (d.calcStj === "moderate" || d.calcStj === "severe") {
    flags.push(`STJ calcium ${d.calcStj} — caution upsizing`);
    score -= calcPenalty[d.calcStj];
  }
  if (d.calcLvot === "severe") {
    flags.push("Severe LVOT calcium — conduction / anchoring review");
    score -= 0.1;
  }
  if (d.calcAnn === "severe") {
    flags.push("Severe annular calcium — PVL and rupture review if oversized");
    score -= 0.08;
  }

  const eligible = hard.length === 0 && matches >= 1;
  const weak = hard.length === 0 && matches === 0 && available > 0 && score > -0.4;

  return { size: s, score, matches, available, flags, hard, eligible, weak, periC, areaC, meanC };
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

function recommend(d) {
  const checks = consistencyFlags(d);
  const hasCore = d.peri != null || d.area != null || d.meanD != null;
  if (!hasCore) {
    return { error: "Enter at least perimeter, area, or mean annulus diameter." };
  }

  const evals = SIZES.map((s) => evaluateSize(s, d));
  const eligible = evals.filter((e) => e.eligible).sort((a, b) => b.score - a.score);

  // If nothing eligible, show nearest with reasons
  if (!eligible.length) {
    const nearest = [...evals].sort((a, b) => b.score - a.score);
    return { d, checks, evals, eligible: [], nearest, primary: null, coPrimary: null, confidence: "low" };
  }

  const best = eligible[0];
  const second = eligible[1];
  let coPrimary = null;
  if (second && Math.abs(best.score - second.score) < 0.08) coPrimary = second;

  // Boundary explicit naming
  const boundary = isBoundary(d.peri);

  let confidence = "high";
  if (best.matches < 2 || best.flags.length >= 2 || coPrimary || boundary) confidence = "mod";
  if (best.matches === 1 && best.available >= 2) confidence = "mod";
  if (best.hard.length || best.flags.some((f) => /Low coronary|outside/.test(f))) confidence = confidence === "high" ? "mod" : confidence;
  if (checks.length) confidence = confidence === "high" ? "mod" : confidence;

  return { d, checks, evals, eligible, nearest: evals, primary: best, coPrimary, confidence, boundary };
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
  if (d.sovH != null) why.push(["SOV height", `${d.sovH} mm`]);
  if (d.lca != null || d.rca != null) why.push(["LCA / RCA height", `${fmt(d.lca)} / ${fmt(d.rca)} mm`]);
  if (d.lvot != null) why.push(["LVOT", `${d.lvot} mm`]);
  if (d.aa != null) why.push(["Ascending aorta", `${d.aa} mm`]);
  if (d.access != null) why.push(["Access min Ø", `${d.access} mm`]);

  const whyHtml = why.map(([k, v]) => `<div class="why-row"><span>${k}</span><span>${v}</span></div>`).join("");

  const flagHtml = [
    ...r.checks.map((f) => `<div class="flag warn"><b>Measurement check</b>${f}</div>`),
    ...(r.primary ? r.primary.hard.map((f) => `<div class="flag bad"><b>Hard constraint</b>${f}</div>`) : []),
    ...(r.primary ? r.primary.flags.map((f) => `<div class="flag warn"><b>Review</b>${f}</div>`) : []),
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

  let compare = "";
  if (r.primary && (r.coPrimary || r.eligible.length > 1)) {
    const a = r.primary.size;
    const b = (r.coPrimary || r.eligible[1]).size;
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
    ["peri","area","meanD","minD","maxD","stj","sovMin","sovL","sovR","sovNC","sovH","lca","rca","lvot","aa","access","notes"].forEach((id) => set(id, ""));
    setCalc("calcAnn", "unknown"); setCalc("calcLvot", "unknown"); setCalc("calcStj", "unknown");
    return;
  }
  if (kind === "mid27") {
    set("peri", 75.2); set("area", 448); set("meanD", 24.1); set("minD", 21.8); set("maxD", 26.5);
    set("stj", 29.4); set("sovL", 32.1); set("sovR", 31.0); set("sovNC", 33.4); set("sovH", 18.2);
    set("lca", 13.6); set("rca", 16.1); set("lvot", 23.4); set("aa", 34.0); set("access", 6.2);
    setCalc("calcAnn", "mild"); setCalc("calcLvot", "none"); setCalc("calcStj", "none");
  }
  if (kind === "edge66") {
    set("peri", 66.0); set("area", 340); set("meanD", 21.0); set("minD", 18.6); set("maxD", 23.8);
    set("stj", 26.2); set("sovL", 27.4); set("sovR", 26.8); set("sovNC", 28.1); set("sovH", 16.0);
    set("lca", 11.2); set("rca", 14.0); set("lvot", 20.1); set("aa", 30.0); set("access", 5.4);
    setCalc("calcAnn", "moderate"); setCalc("calcLvot", "mild"); setCalc("calcStj", "moderate");
  }
  if (kind === "edge79") {
    set("peri", 79.0); set("area", 500); set("meanD", 25.2); set("minD", 23.1); set("maxD", 27.4);
    set("stj", 31.8); set("sovL", 33.0); set("sovR", 31.2); set("sovNC", 34.5); set("sovH", 17.5);
    set("lca", 14.8); set("rca", 17.2); set("lvot", 24.8); set("aa", 36.5); set("access", 6.8);
    setCalc("calcAnn", "mild"); setCalc("calcLvot", "none"); setCalc("calcStj", "none");
  }
}

function parseLooseNumbers(text) {
  const t = text.replace(/,/g, "");
  const pick = (labels) => {
    for (const lab of labels) {
      const re = new RegExp(lab + "[^0-9]{0,24}(\\d+(?:\\.\\d+)?)", "i");
      const m = t.match(re);
      if (m) return parseFloat(m[1]);
    }
    return null;
  };
  return {
    peri: pick(["perimeter", "annulus perimeter", "peri"]),
    area: pick(["annulus area", "area"]),
    meanD: pick(["mean diameter", "average ø", "average diameter", "mean ø"]),
    minD: pick(["min ø", "min diameter", "minimum diameter"]),
    maxD: pick(["max ø", "max diameter", "maximum diameter"]),
    stj: pick(["stj", "sino-?tubular"]),
    lca: pick(["lca height", "left coronary", "lms height", "left main"]),
    rca: pick(["rca height", "right coronary"]),
    aa: pick(["ascending aorta", "asc\\.? aorta"]),
    lvot: pick(["lvot"]),
    sovH: pick(["sinus of valsalva height", "sov height"])
  };
}

function applyParsed(p) {
  const map = { peri:"peri", area:"area", meanD:"meanD", minD:"minD", maxD:"maxD", stj:"stj", lca:"lca", rca:"rca", aa:"aa", lvot:"lvot", sovH:"sovH" };
  let n = 0;
  Object.entries(map).forEach(([k, id]) => {
    if (p[k] != null && !$(id).value) { $(id).value = p[k]; n++; }
  });
  return n;
}

async function handleFile(file) {
  $("ocr-status").textContent = "Reading " + file.name + "…";
  if (file.type.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    $("img-preview").innerHTML = `<img alt="upload" src="${url}">`;
    $("ocr-status").textContent = "Image attached as reference. Type or paste the 3mensio numbers — on-device OCR of live clinical screenshots is not reliable enough to auto-size without your confirmation.";
    return;
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    $("img-preview").innerHTML = "";
    try {
      if (!window.pdfjsLib) {
        $("ocr-status").textContent = "PDF.js not loaded (needs network once). Paste the report text below instead.";
        return;
      }
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let text = "";
      const max = Math.min(pdf.numPages, 8);
      for (let i = 1; i <= max; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it) => it.str).join(" ") + "\n";
      }
      $("ocr-status").textContent = text.slice(0, 1200) || "No extractable text (scanned PDF).";
      const parsed = parseLooseNumbers(text);
      const n = applyParsed(parsed);
      $("ocr-status").textContent += `\n\nAuto-filled ${n} field(s). Check every number before recommending.`;
    } catch (err) {
      $("ocr-status").textContent = "Could not parse PDF. Paste measurements or enter manually. " + err.message;
    }
  }
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
      <td class="num">≥${s.sovH}</td>
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

function init() {
  bindSeg("calcAnn"); bindSeg("calcLvot"); bindSeg("calcStj");
  setCalc("calcAnn", "unknown"); setCalc("calcLvot", "unknown"); setCalc("calcStj", "unknown");
  renderCharts();

  $("btn-go").addEventListener("click", () => {
    const r = recommend(gather());
    window.__lastRec = r;
    renderResult(r);
    if (r.primary && $("cValveSize") && !$("cValveSize").value) {
      $("cValveSize").value = r.coPrimary
        ? `${r.primary.size.size} or ${r.coPrimary.size.size}`
        : String(r.primary.size.size);
    }
    showScreen("result");
  });
  $("btn-clear").addEventListener("click", () => loadExample("clear"));
  document.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => loadExample(b.dataset.ex)));
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => showScreen(b.dataset.screen)));
  $("file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
  });
  $("paste").addEventListener("input", () => {
    const parsed = parseLooseNumbers($("paste").value);
    const n = applyParsed(parsed);
    if (n) $("ocr-status").textContent = `Picked ${n} value(s) from pasted text. Confirm before recommending.`;
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  if (window.initCase) initCase();
}

document.addEventListener("DOMContentLoaded", init);
window.navitorRecommend = recommend;
window.navitorGather = gather;
