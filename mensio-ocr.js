function mensioInRange(v, min, max) {
  return Number.isFinite(v) && v >= min && v <= max;
}
function fixDec(v, min, max) {
  if (!Number.isFinite(v)) return null;
  if (mensioInRange(v, min, max)) return v;
  if (mensioInRange(v / 10, min, max)) return +(v / 10).toFixed(1);
  return null;
}
function firstNum(re, text) {
  const m = String(text || "").match(re);
  return m ? parseFloat(m[1]) : null;
}

function parseSov(text) {
  const t = String(text || "");
  const u = t.toUpperCase();
  const blockMatch = u.match(/SINUS\s*OF\s*VALSALVA[\s\S]{0,400}/);
  const block = blockMatch ? blockMatch[0] : u;
  let sovL = fixDec(
    firstNum(/SOV\s*L(?:EFT)?[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/\bLEFT(?:\s*CORONARY)?(?:\s*CUSP)?[^0-9]{0,16}(\d+\.?\d*)/i, block) ||
    firstNum(/\bLCC[^0-9]{0,12}(\d+\.?\d*)/i, block) ||
    firstNum(/\bL\s*[:.]\s*(\d+\.?\d*)/i, block),
    20, 50
  );
  let sovR = fixDec(
    firstNum(/SOV\s*R(?:IGHT)?[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/\bRIGHT(?:\s*CORONARY)?(?:\s*CUSP)?[^0-9]{0,16}(\d+\.?\d*)/i, block) ||
    firstNum(/\bRCC[^0-9]{0,12}(\d+\.?\d*)/i, block) ||
    firstNum(/\bR\s*[:.]\s*(\d+\.?\d*)/i, block),
    20, 50
  );
  let sovNC = fixDec(
    firstNum(/SOV\s*N(?:C|ON)?[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/NON[\s\-]*CORONARY[^0-9]{0,16}(\d+\.?\d*)/i, block) ||
    firstNum(/\bNCC[^0-9]{0,12}(\d+\.?\d*)/i, block) ||
    firstNum(/\bNC\s*[:.]\s*(\d+\.?\d*)/i, block),
    20, 50
  );
  if (sovL == null || sovR == null || sovNC == null) {
    const triple = block.match(/DIAMETERS?[^0-9]{0,40}(\d+\.?\d*)[^0-9]{1,20}(\d+\.?\d*)[^0-9]{1,20}(\d+\.?\d*)/i);
    if (triple) {
      const a = fixDec(parseFloat(triple[1]), 20, 50);
      const b = fixDec(parseFloat(triple[2]), 20, 50);
      const c = fixDec(parseFloat(triple[3]), 20, 50);
      if (sovL == null) sovL = a;
      if (sovR == null) sovR = b;
      if (sovNC == null) sovNC = c;
    }
  }
  const nums = [sovL, sovR, sovNC].filter((v) => v != null);
  const sovMin = nums.length ? Math.min.apply(null, nums) : null;
  return { sovL, sovR, sovNC, sovMin };
}

function parseCoronaries(text) {
  const t = String(text || "");
  const lca = fixDec(
    firstNum(/L\s*C\s*A\s*HEIGHT[^0-9]{0,20}(\d+\.?\d*)/i, t) ||
    firstNum(/LEFT\s*(?:MAIN|CORONARY)(?:\s*HEIGHT)?[^0-9]{0,20}(\d+\.?\d*)/i, t) ||
    firstNum(/\bLMS\s*HEIGHT[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/LCA[^0-9]{0,20}(\d+\.?\d*)/i, t),
    6, 28
  );
  const rca = fixDec(
    firstNum(/R\s*C\s*A\s*HEIGHT[^0-9]{0,20}(\d+\.?\d*)/i, t) ||
    firstNum(/RIGHT\s*CORONARY(?:\s*HEIGHT)?[^0-9]{0,20}(\d+\.?\d*)/i, t) ||
    firstNum(/RCA[^0-9]{0,20}(\d+\.?\d*)/i, t),
    6, 28
  );
  return { lca, rca };
}

function parseMensio(text) {
  const raw = String(text || "");
  const t = raw.replace(/,/g, ".").replace(/mm\s*[\u00b22]/gi, " mm2");
  const u = t.toUpperCase();
  const peri = fixDec(
    firstNum(/PERIMETER(?!\s*DERIVED)[^0-9]{0,24}(\d+\.?\d*)/i, t) ||
    firstNum(/\bPERI(?:METER)?\s*[:.]?\s*(\d+\.?\d*)/i, t) ||
    firstNum(/\bP\s+(\d{2,3}(?:\.\d)?)\s*MM/i, u),
    55, 100
  );
  const periPD = fixDec(
    firstNum(/PERIMETER\s*DERIVED[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/\bP\s*D[^0-9]{0,10}(\d+\.\d+)/i, u),
    17, 35
  );
  const area = fixDec(
    firstNum(/AREA(?!\s*DERIVED)[^0-9]{0,24}(\d+\.?\d*)/i, t) ||
    firstNum(/\bA\s+(\d{3,4}(?:\.\d)?)\s*M/i, u),
    250, 800
  );
  const stj = fixDec(
    firstNum(/STJ\s*[\u00d8\u00f8O:][^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/STJ[^0-9]{0,16}(\d+\.?\d*)/i, t),
    18, 50
  );
  const aa = fixDec(
    firstNum(/ASC(?:ENDING)?\.?\s*AORTA\s*[\u00d8\u00f8O:][^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/\bA\.?A\.?[^0-9]{0,12}(\d+\.?\d*)/i, u),
    20, 50
  );
  const lvot = fixDec(
    firstNum(/LVOT\s*[\u00d8\u00f8O:][^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/LVOT[^0-9]{0,16}(\d+\.?\d*)/i, t),
    16, 40
  );
  const cor = parseCoronaries(t);
  const meanD = fixDec(
    firstNum(/MEAN(?:\s*DIAMETER)?[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/AVERAGE\s*[\u00d8\u00f8O][^0-9]{0,12}(\d+\.?\d*)/i, t),
    16, 35
  );
  const minD = fixDec(firstNum(/MIN\s*[\u00d8\u00f8O][^0-9]{0,12}(\d+\.?\d*)/i, t), 14, 34);
  const maxD = fixDec(firstNum(/MAX\s*[\u00d8\u00f8O][^0-9]{0,12}(\d+\.?\d*)/i, t), 16, 40);
  const sovH = fixDec(
    firstNum(/VALSALVA HEIGHT[^0-9]{0,16}(\d+\.?\d*)/i, t) ||
    firstNum(/SOV\s*HEIGHT[^0-9]{0,16}(\d+\.?\d*)/i, t),
    10, 30
  );
  const sov = parseSov(t);
  return {
    peri, periPD, area, meanD, minD, maxD, stj,
    lca: cor.lca, rca: cor.rca,
    aa, lvot, sovH,
    sovL: sov.sovL, sovR: sov.sovR, sovNC: sov.sovNC, sovMin: sov.sovMin
  };
}

function applyMensio(p) {
  const map = {
    peri: "peri", periPD: "periPD", area: "area", meanD: "meanD",
    minD: "minD", maxD: "maxD", stj: "stj", lca: "lca", rca: "rca",
    aa: "aa", lvot: "lvot", sovH: "sovH", sovL: "sovL", sovR: "sovR", sovNC: "sovNC", sovMin: "sovMin"
  };
  let n = 0;
  Object.entries(map).forEach(([k, id]) => {
    if (p[k] == null || !$(id)) return;
    $(id).value = p[k];
    n++;
  });
  if ($("periPD") && p.periPD != null) $("periPD").value = Number(p.periPD).toFixed(1);
  return n;
}

function parseLooseNumbers(text) {
  return parseMensio(text);
}

function applyParsed(p) {
  return applyMensio(p);
}

async function handleFile(file) {
  if (!$("ocr-status")) return;
  $("ocr-status").textContent = "Reading " + file.name + "\u2026";
  if (file.type.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    if ($("img-preview")) $("img-preview").innerHTML = `<img alt="upload" src="${url}">`;
    try {
      let text = "";
      if (typeof fileToCanvas === "function" && typeof ocrCanvas === "function") {
        $("ocr-status").textContent = "Reading 3mensio numbers from photo\u2026";
        const { canvas } = await fileToCanvas(file);
        text = await ocrCanvas(canvas);
      }
      if ($("paste") && text) $("paste").value = text.slice(0, 2000);
      const parsed = parseMensio(text);
      const n = applyMensio(parsed);
      const found = Object.entries(parsed).filter(([, v]) => v != null).map(([k, v]) => k + " " + v).join(" \u00b7 ");
      $("ocr-status").textContent = n
        ? ("Filled " + n + " Size-tab field(s). Check every number before Recommend.\n" + found)
        : "Could not read numbers from this photo. Paste the 3mensio text or type them. " + (text ? "OCR saw: " + text.slice(0, 240) : "");
    } catch (err) {
      $("ocr-status").textContent = "Could not read photo. Type or paste the numbers. " + err.message;
    }
    return;
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    await handlePdf(file);
  }
}

function countMensio(p) {
  return Object.values(p || {}).filter((v) => v != null).length;
}

/* Render one pdf.js page to a PNG Blob, longest side ~2000 px. */
async function pdfPageToBlob(page) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(4, 2000 / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not render page"))), "image/png"));
}

async function handlePdf(file) {
  const status = $("ocr-status");
  if ($("img-preview")) $("img-preview").innerHTML = "";
  try {
    if (!window.pdfjsLib) {
      status.textContent = "PDF reader not loaded. Paste report text below.";
      return;
    }
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    const max = Math.min(pdf.numPages, 8);
    for (let i = 1; i <= max; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join("") + "\n";
    }
    const fromText = parseMensio(text);
    let parsed = fromText;
    let used = text;
    let source = "PDF text";
    if (countMensio(fromText) < 6 && typeof fileToCanvas === "function" && typeof ocrCanvas === "function") {
      /* Few or no numbers in the text layer: 3mensio often stores them as pictures.
         Read the page images with the same reader as screenshots. */
      const pages = Math.min(pdf.numPages, 4);
      let ocrText = "";
      for (let i = 1; i <= pages; i++) {
        status.textContent = "Reading page " + i + " of " + pages + "\u2026";
        const blob = await pdfPageToBlob(await pdf.getPage(i));
        const { canvas, url } = await fileToCanvas(blob);
        if (i === 1 && $("img-preview")) $("img-preview").innerHTML = `<img alt="PDF page 1" src="${url}">`;
        ocrText += (await ocrCanvas(canvas)) + "\n";
      }
      const fromOcr = parseMensio(ocrText);
      parsed = {};
      Object.keys(fromOcr).forEach((k) => { parsed[k] = fromText[k] != null ? fromText[k] : fromOcr[k]; });
      const nums = [parsed.sovL, parsed.sovR, parsed.sovNC].filter((v) => v != null);
      if (fromText.sovMin == null && nums.length) parsed.sovMin = Math.min.apply(null, nums);
      if (countMensio(fromOcr) > countMensio(fromText)) {
        source = countMensio(fromText) ? "PDF text and page images" : "PDF page images";
        used = (text.trim() ? text + "\n" : "") + ocrText;
      }
    }
    if ($("paste") && used.trim() && !$("paste").value) $("paste").value = used.slice(0, 2000);
    const n = applyMensio(parsed);
    const found = Object.entries(parsed).filter(([, v]) => v != null).map(([k, v]) => k + " " + v).join(" \u00b7 ");
    status.textContent = n
      ? "Filled " + n + " Size-tab field(s) from " + source + ". Check every number before Recommend.\n" + found
      : "Could not read numbers from this PDF. Paste the 3mensio text or type them. " + (used.trim() ? "Saw: " + used.slice(0, 240) : "");
  } catch (err) {
    status.textContent = "Could not read PDF. Type or paste the numbers. " + err.message;
  }
}
