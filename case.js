const CASE_KEY = "navitor-case-v1";
const GTIN_REF = {
  "05415067045805": { kind: "valve", ref: "NVRO-23" },
  "05415067058003": { kind: "delivery", ref: "FNAV-DS-SM" },
  "05415067036667": { kind: "loading", ref: "NVTR-LS-SM" }
};

const CASE_FIELDS = [
  "cDate","cHospital","cOp1","cLoader","cOp2","cTs","cStudy","cAge","cRhythm",
  "cPd","cMin","cMax","cPeri","cLvot","cSov","cStj","cLca","cRca","cAccess","cAnatomy",
  "cValveSize","cBav","cBalloon","cSheath","cWire","cRecaptures","cHeight","cPost","cPvl","cGradient","cPpi","cComments",
  "vRef","vSn","vExp","vUdi","dRef","dLot","dExp","dUdi","lRef","lLot","lExp","lUdi"
];

function parseUDI(raw) {
  if (!raw) return {};
  const s = raw.replace(/\s/g, "");
  const out = {};
  const gtin = s.match(/\(01\)(\d{14})/) || s.match(/^01(\d{14})/);
  const exp = s.match(/\(17\)(\d{6})/) || s.match(/17(\d{6})/);
  const lot = s.match(/\(10\)([^\(]+)/) || s.match(/10([A-Z0-9\-]+)/i);
  const sn = s.match(/\(21\)([^\(]+)/) || s.match(/21(\d{6,})/);
  if (gtin) out.gtin = gtin[1];
  if (exp) {
    const y = exp[1].slice(0, 2), m = exp[1].slice(2, 4), d = exp[1].slice(4, 6);
    out.exp = `20${y}-${m}-${d}`;
  }
  if (lot) out.lot = lot[1].replace(/[^A-Z0-9\-]/gi, "");
  if (sn) out.sn = sn[1].replace(/[^A-Z0-9\-]/gi, "");
  if (out.gtin && GTIN_REF[out.gtin]) {
    out.ref = GTIN_REF[out.gtin].ref;
    out.kind = GTIN_REF[out.gtin].kind;
  }
  return out;
}

function applyUDI(which, parsed) {
  if (!parsed || !Object.keys(parsed).length) return;
  if (which === "v" || parsed.kind === "valve") {
    if (parsed.ref) $("vRef").value = parsed.ref;
    if (parsed.sn) $("vSn").value = parsed.sn;
    if (parsed.exp) $("vExp").value = parsed.exp;
  }
  if (which === "d" || parsed.kind === "delivery") {
    if (parsed.ref) $("dRef").value = parsed.ref;
    if (parsed.lot) $("dLot").value = parsed.lot;
    if (parsed.exp) $("dExp").value = parsed.exp;
  }
  if (which === "l" || parsed.kind === "loading") {
    if (parsed.ref) $("lRef").value = parsed.ref;
    if (parsed.lot) $("lLot").value = parsed.lot;
    if (parsed.exp) $("lExp").value = parsed.exp;
  }
}

function cuspValue(id) {
  return ($(id) && $(id).dataset.v) || "—";
}

function gatherCase() {
  const o = {};
  CASE_FIELDS.forEach((id) => { o[id] = $(id) ? $(id).value.trim() : ""; });
  o.gender = $("cGender").dataset.v || "";
  o.caN = cuspValue("caN");
  o.caR = cuspValue("caR");
  o.caL = cuspValue("caL");
  return o;
}

function line(label, value) {
  if (!value) return null;
  return `${label}: ${value}`;
}

function buildNote() {
  const c = gatherCase();
  const rec = window.__lastRec;
  const recLine = rec && rec.primary
    ? (rec.coPrimary
      ? `Sizer suggestion: ${rec.primary.size.size} or ${rec.coPrimary.size.size} mm (${rec.confidence})`
      : `Sizer suggestion: ${rec.primary.size.size} mm (${rec.confidence})`)
    : null;

  const blocks = [
    "NAVITOR PROCTOR FORM",
    line("Date", c.cDate),
    line("Hospital", c.cHospital),
    line("Operator 1", c.cOp1),
    line("Loader", c.cLoader),
    line("Operator 2", c.cOp2),
    line("TS", c.cTs),
    line("Clinical study", c.cStudy),
    "",
    line("Age", c.cAge),
    line("Gender", c.gender),
    line("Rhythm", c.cRhythm),
    "",
    line("PD", c.cPd),
    (c.cMin || c.cMax) ? `Min/Max: ${c.cMin || "—"} / ${c.cMax || "—"}` : null,
    line("Perimeter", c.cPeri),
    line("LVOT", c.cLvot),
    line("SOV", c.cSov),
    line("STJ", c.cStj),
    line("LCA", c.cLca),
    line("RCA", c.cRca),
    `Ca++  N:${c.caN}  R:${c.caR}  L:${c.caL}`,
    line("Access", c.cAccess),
    line("Anatomy", c.cAnatomy),
    "",
    line("Valve size", c.cValveSize),
    recLine,
    line("BAV", c.cBav),
    line("Balloon", c.cBalloon),
    line("Sheath", c.cSheath),
    line("Wire", c.cWire),
    line("Recaptures", c.cRecaptures),
    line("Implant height", c.cHeight),
    line("Post-dilation", c.cPost),
    line("PVL", c.cPvl),
    line("Gradient", c.cGradient),
    line("PPI", c.cPpi),
    "",
    "VALVE",
    [c.vRef, c.vSn && `SN ${c.vSn}`, c.vExp && `exp ${c.vExp}`].filter(Boolean).join("  ") || "—",
    c.vUdi ? `UDI ${c.vUdi}` : null,
    "DELIVERY SYSTEM",
    [c.dRef, c.dLot && `LOT ${c.dLot}`, c.dExp && `exp ${c.dExp}`].filter(Boolean).join("  ") || "—",
    c.dUdi ? `UDI ${c.dUdi}` : null,
    "LOADING SYSTEM",
    [c.lRef, c.lLot && `LOT ${c.lLot}`, c.lExp && `exp ${c.lExp}`].filter(Boolean).join("  ") || "—",
    c.lUdi ? `UDI ${c.lUdi}` : null,
    "",
    c.cComments ? `Comments: ${c.cComments}` : null,
    "",
    "— generated on phone for Salesforce. Not official Abbott software. No patient identifiers should be stored on GitHub."
  ];
  return blocks.filter((x) => x !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}

function saveCase() {
  try {
    const data = gatherCase();
    data.photos = {
      v: $("vPhotoImg").dataset.url || "",
      d: $("dPhotoImg").dataset.url || "",
      l: $("lPhotoImg").dataset.url || ""
    };
    localStorage.setItem(CASE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function loadCase() {
  try {
    const raw = localStorage.getItem(CASE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    CASE_FIELDS.forEach((id) => {
      if ($(id) && data[id] != null) $(id).value = data[id];
    });
    if (data.gender) setCalc("cGender", data.gender);
    ["caN","caR","caL"].forEach((id) => {
      if (data[id]) {
        $(id).dataset.v = data[id];
        refreshCuspButtons(id);
      }
    });
  } catch (_) {}
}

function refreshCuspButtons(id) {
  const wrap = $(id);
  wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === wrap.dataset.v));
}

function buildCusps() {
  ["caN","caR","caL"].forEach((id) => {
    const wrap = $(id);
    const label = wrap.querySelector("b");
    wrap.innerHTML = "";
    wrap.appendChild(label);
    ["none","mild","mod","sev"].forEach((v) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.v = v;
      b.textContent = v;
      b.addEventListener("click", () => {
        wrap.dataset.v = v;
        refreshCuspButtons(id);
        saveCase();
        previewNote();
      });
      wrap.appendChild(b);
    });
    wrap.dataset.v = wrap.dataset.v || "none";
    refreshCuspButtons(id);
  });
}

function previewNote() {
  if ($("note-preview")) $("note-preview").textContent = buildNote();
}

function pullFromSize() {
  const peri = $("peri").value;
  const minD = $("minD").value;
  const maxD = $("maxD").value;
  const lvot = $("lvot").value;
  const stj = $("stj").value;
  const lca = $("lca").value;
  const rca = $("rca").value;
  const access = $("access").value;
  const sovL = $("sovL").value, sovR = $("sovR").value, sovNC = $("sovNC").value;
  const sovMin = $("sovMin").value;
  if (peri) {
    $("cPeri").value = peri;
    $("cPd").value = (parseFloat(peri) / Math.PI).toFixed(1);
  }
  if (minD) $("cMin").value = minD;
  if (maxD) $("cMax").value = maxD;
  if (lvot) $("cLvot").value = lvot;
  if (stj) $("cStj").value = stj;
  if (lca) $("cLca").value = lca;
  if (rca) $("cRca").value = rca;
  if (access) $("cAccess").value = access;
  if (sovL || sovR || sovNC) $("cSov").value = [sovL && `L ${sovL}`, sovR && `R ${sovR}`, sovNC && `NC ${sovNC}`].filter(Boolean).join(" / ");
  else if (sovMin) $("cSov").value = sovMin;
  const rec = window.__lastRec;
  if (rec && rec.primary && !$("cValveSize").value) {
    $("cValveSize").value = rec.coPrimary
      ? `${rec.primary.size.size} or ${rec.coPrimary.size.size}`
      : String(rec.primary.size.size);
  }
  saveCase();
  previewNote();
  toast("Pulled Size tab into the case card");
}

function toast(msg) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 2200);
}

async function shareToNotes() {
  const text = buildNote();
  previewNote();
  const title = `Navitor ${$("cHospital").value || "case"} ${$("cDate").value || ""}`.trim();
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  await copyCase();
}

async function copyCase() {
  const text = buildNote();
  previewNote();
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Open Notes → New note → Paste");
  } catch (_) {
    toast("Copy blocked — select the preview and copy");
  }
}

function newCase() {
  if (!confirm("Clear this case card? Size-tab numbers stay.")) return;
  CASE_FIELDS.forEach((id) => { if ($(id) && $(id).type !== "date") $(id).value = ""; });
  $("cDate").value = new Date().toISOString().slice(0, 10);
  setCalc("cGender", "");
  ["caN","caR","caL"].forEach((id) => { $(id).dataset.v = "none"; refreshCuspButtons(id); });
  ["vPhotoImg","dPhotoImg","lPhotoImg"].forEach((id) => {
    $(id).style.display = "none";
    $(id).src = "";
    $(id).dataset.url = "";
  });
  localStorage.removeItem(CASE_KEY);
  previewNote();
}

function wirePhoto(inputId, imgId) {
  $(inputId).addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = $(imgId);
    img.src = url;
    img.style.display = "block";
    img.dataset.url = url;
  });
}

function initCase() {
  if (!$("cDate")) return;
  if (!$("cDate").value) $("cDate").value = new Date().toISOString().slice(0, 10);
  bindSeg("cGender");
  buildCusps();
  loadCase();
  wirePhoto("vPhoto", "vPhotoImg");
  wirePhoto("dPhoto", "dPhotoImg");
  wirePhoto("lPhoto", "lPhotoImg");
  ["vUdi","dUdi","lUdi"].forEach((id) => {
    $(id).addEventListener("change", () => {
      const which = id[0];
      applyUDI(which, parseUDI($(id).value));
      saveCase();
      previewNote();
    });
  });
  CASE_FIELDS.forEach((id) => {
    if ($(id)) $(id).addEventListener("input", () => { saveCase(); previewNote(); });
  });
  $("btn-share").addEventListener("click", shareToNotes);
  $("btn-copy").addEventListener("click", copyCase);
  $("btn-pull-size").addEventListener("click", pullFromSize);
  $("btn-new-case").addEventListener("click", newCase);
  $("peri").addEventListener("input", () => {
    const p = parseFloat($("peri").value);
    if (Number.isFinite(p) && !$("cPeri").dataset.locked) {
      $("cPeri").value = $("peri").value;
      $("cPd").value = (p / Math.PI).toFixed(1);
    }
  });
  previewNote();
}

window.initCase = initCase;
window.pullFromSize = pullFromSize;
window.buildNote = buildNote;
