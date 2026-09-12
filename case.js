const CASE_KEY = "navitor-case-v1";
const stickerFiles = [];

function rememberStickerFile(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return;
  const exists = stickerFiles.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
  if (!exists) stickerFiles.push(file);
}
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
  const files = stickerFiles.slice();
  if (navigator.share) {
    try {
      const payload = { title, text };
      if (files.length && navigator.canShare && navigator.canShare({ files })) {
        payload.files = files;
      } else if (files.length) {
        payload.files = files;
      }
      await navigator.share(payload);
      if (!files.length) toast("Shared text only — add a sticker photo first to include images");
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
      try {
        await navigator.share({ title, text });
        toast("Notes got the text. iOS blocked the photos — add them to the note from Camera Roll");
        return;
      } catch (err2) {
        if (err2 && err2.name === "AbortError") return;
      }
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
  stickerFiles.length = 0;
  previewNote();
}

function setScanStatus(msg) {
  if ($("scan-status")) $("scan-status").textContent = msg;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src.includes(src.split("/").pop()))) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(el);
  });
}

async function ensureTesseract() {
  if (window.Tesseract) return window.Tesseract;
  setScanStatus("Loading reader (first time only)…");
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
  return window.Tesseract;
}

function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const max = 2000;
      let w = img.width, h = img.height;
      if (Math.max(w, h) > max) {
        const s = max / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        const v = g > 150 ? 255 : g < 90 ? 0 : g;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(data, 0, 0);
      resolve({ canvas, url: img.src, img });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function findUdis(text) {
  const compact = text.replace(/\s+/g, "");
  const out = [];
  const re = /\(01\)\d{14}(?:\(\d{2}\)[A-Za-z0-9.\-]{1,20})+/g;
  let m;
  while ((m = re.exec(compact))) out.push(m[0]);
  // also raw AI string without all parens if OCR dropped some
  const re2 = /01(\d{14})17(\d{6})(?:10([A-Z0-9]{4,})|21([A-Z0-9]{4,}))/g;
  while ((m = re2.exec(compact))) {
    const udi = `(01)${m[1]}(17)${m[2]}${m[3] ? "(10)" + m[3] : "(21)" + m[4]}`;
    if (!out.includes(udi)) out.push(udi);
  }
  return out;
}

function findRefs(text) {
  const t = text.toUpperCase().replace(/O(?=\d)/g, "0");
  const refs = [];
  const patterns = [
    /FNAV[\s\-]*DS[\s\-]*(SM|LG)/g,
    /NVTR[\s\-]*LS[\s\-]*(SM|LG)/g,
    /NVRO[\s\-]*(23|25|27|29|35)/g,
    /NVTR[\s\-]*(23|25|27|29|35)/g
  ];
  patterns.forEach((re, i) => {
    let m;
    while ((m = re.exec(t))) {
      if (i === 0) refs.push({ kind: "delivery", ref: "FNAV-DS-" + m[1] });
      else if (i === 1) refs.push({ kind: "loading", ref: "NVTR-LS-" + m[1] });
      else if (i === 2) refs.push({ kind: "valve", ref: "NVRO-" + m[1] });
      else refs.push({ kind: "valve", ref: "NVTR-" + m[1] });
    }
  });
  return refs;
}

function extractDevicesFromText(text) {
  const devices = { valve: {}, delivery: {}, loading: {} };
  findUdis(text).forEach((udi) => {
    const p = parseUDI(udi);
    p.udi = udi;
    if (!p.kind) {
      if (p.sn) p.kind = "valve";
      else if (p.lot) p.kind = p.kind || "delivery";
    }
    if (p.kind && devices[p.kind]) Object.assign(devices[p.kind], p);
  });
  findRefs(text).forEach((r) => {
    if (!devices[r.kind].ref) devices[r.kind].ref = r.ref;
    else if (!devices[r.kind].ref) devices[r.kind].ref = r.ref;
    devices[r.kind].ref = devices[r.kind].ref || r.ref;
  });
  const dates = text.match(/20[2-3]\d[-/.](?:0\d|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01])/g) || [];
  // assign leftover dates only if a device is missing expiry
  dates.map((d) => d.replace(/[/.]/g, "-")).forEach((d) => {
    ["valve", "delivery", "loading"].forEach((k) => {
      if (devices[k].ref && !devices[k].exp) devices[k].exp = d;
    });
  });
  const lots = text.match(/LOT\s*([A-Z0-9]{5,})/ig) || [];
  if (lots[0] && !devices.delivery.lot) devices.delivery.lot = lots[0].replace(/LOT\s*/i, "");
  if (lots[1] && !devices.loading.lot) devices.loading.lot = lots[1].replace(/LOT\s*/i, "");
  return devices;
}

function applyDevices(devices) {
  const map = {
    valve: { ref: "vRef", sn: "vSn", exp: "vExp", udi: "vUdi", lot: null },
    delivery: { ref: "dRef", sn: null, exp: "dExp", udi: "dUdi", lot: "dLot" },
    loading: { ref: "lRef", sn: null, exp: "lExp", udi: "lUdi", lot: "lLot" }
  };
  let filled = 0;
  Object.entries(map).forEach(([kind, ids]) => {
    const d = devices[kind] || {};
    Object.entries(ids).forEach(([k, id]) => {
      if (id && d[k] && !$(id).value) {
        if ($(id).tagName === "SELECT") {
          const opt = [...$(id).options].find((o) => o.value === d[k]);
          if (opt) $(id).value = d[k];
          else {
            const extra = document.createElement("option");
            extra.value = d[k];
            extra.textContent = d[k];
            $(id).appendChild(extra);
            $(id).value = d[k];
          }
        } else $(id).value = d[k];
        filled++;
      }
    });
  });
  if (devices.valve.ref && !$("cValveSize").value) {
    const m = devices.valve.ref.match(/(\d{2})$/);
    if (m) $("cValveSize").value = m[1];
  }
  if (devices.delivery.ref && !$("cSheath").value) {
    $("cSheath").value = devices.delivery.ref === "FNAV-DS-LG" ? "FlexNav LG 15F" : "FlexNav SM 14F";
  }
  return filled;
}

async function ocrCanvas(canvas) {
  const Tesseract = await ensureTesseract();
  const worker = await Tesseract.createWorker("eng");
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()-./ "
  });
  const { data } = await worker.recognize(canvas);
  await worker.terminate();
  return data.text || "";
}

async function scanFiles(fileList, previewId) {
  const files = [...fileList].filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  files.forEach(rememberStickerFile);
  setScanStatus("Reading " + files.length + " photo(s)…");
  const preview = $("scan-previews") || $(previewId);
  if ($("scan-previews")) $("scan-previews").innerHTML = "";
  let allText = "";
  let lastUrl = "";
  for (const file of files) {
    try {
      const { canvas, url } = await fileToCanvas(file);
      lastUrl = url;
      if ($("scan-previews")) {
        const im = document.createElement("img");
        im.src = url;
        im.alt = file.name;
        $("scan-previews").appendChild(im);
      }
      setScanStatus("OCR on " + file.name + "…");
      const text = await ocrCanvas(canvas);
      allText += "\n" + text;
    } catch (err) {
      setScanStatus("Could not read " + file.name + ": " + err.message);
    }
  }
  const devices = extractDevicesFromText(allText);
  const n = applyDevices(devices);
  if (lastUrl) {
    ["vPhotoImg", "dPhotoImg", "lPhotoImg"].forEach((id) => {
      if ($(id) && !$(id).src) {
        $(id).src = lastUrl;
        $(id).style.display = "block";
      }
    });
  }
  const summary = [
    devices.valve.ref && ("Valve " + devices.valve.ref + (devices.valve.sn ? " SN " + devices.valve.sn : "")),
    devices.delivery.ref && ("Delivery " + devices.delivery.ref + (devices.delivery.lot ? " LOT " + devices.delivery.lot : "")),
    devices.loading.ref && ("Loading " + devices.loading.ref + (devices.loading.lot ? " LOT " + devices.loading.lot : ""))
  ].filter(Boolean);
  setScanStatus(
    (summary.length ? "Filled: " + summary.join(" · ") : "No REF/UDI found.") +
    "\n\nCheck every field. Raw text:\n" + allText.slice(0, 800)
  );
  saveCase();
  previewNote();
  toast(n ? "Sticker fields updated — check them" : "Could not read stickers — try a closer, flatter photo");
}

function wirePhoto(inputId, imgId, scanAlso) {
  if (!$(inputId)) return;
  $(inputId).addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const f = files[0];
    const url = URL.createObjectURL(f);
    if ($(imgId)) {
      $(imgId).src = url;
      $(imgId).style.display = "block";
      $(imgId).dataset.url = url;
    }
    if (scanAlso !== false) await scanFiles(files, imgId);
  });
}

function initCase() {
  if (!$("cDate")) return;
  if (!$("cDate").value) $("cDate").value = new Date().toISOString().slice(0, 10);
  bindSeg("cGender");
  buildCusps();
  loadCase();
  wirePhoto("vPhoto", "vPhotoImg");
  wirePhoto("vPhotoLib", "vPhotoImg");
  wirePhoto("dPhoto", "dPhotoImg");
  wirePhoto("dPhotoLib", "dPhotoImg");
  wirePhoto("lPhoto", "lPhotoImg");
  wirePhoto("lPhotoLib", "lPhotoImg");
  if ($("scanLib")) $("scanLib").addEventListener("change", (e) => { if (e.target.files.length) scanFiles(e.target.files); });
  if ($("scanCam")) $("scanCam").addEventListener("change", (e) => { if (e.target.files.length) scanFiles(e.target.files); });
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
