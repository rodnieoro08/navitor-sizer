function inRange(v, min, max) {
  return Number.isFinite(v) && v >= min && v <= max;
}
function fixDec(v, min, max) {
  if (!Number.isFinite(v)) return null;
  if (inRange(v, min, max)) return v;
  if (inRange(v / 10, min, max)) return +(v / 10).toFixed(1);
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
  const lca = fixDec(firstNum(/LCA\s*HEIGHT[^0-9]{0,16}(\d+\.?\d*)/i, t), 6, 30);
  const rca = fixDec(firstNum(/RCA\s*HEIGHT[^0-9]{0,16}(\d+\.?\d*)/i, t), 6, 30);
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
    peri, periPD, area, meanD, minD, maxD, stj, lca, rca, aa, lvot, sovH,
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
  if (typeof updatePeriPD === "function" && p.periPD == null) updatePeriPD();
  if ($("periPD") && p.periPD != null) $("periPD").value = Number(p.periPD).toFixed(1);
  if (typeof updateMeanFromMinMax === "function" && !p.meanD) updateMeanFromMinMax();
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
    if ($("img-preview")) $("img-preview").innerHTML = "";
    try {
      if (!window.pdfjsLib) {
        $("ocr-status").textContent = "PDF reader not loaded. Paste report text below.";
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
      if ($("paste") && text && !$("paste").value) $("paste").value = text.slice(0, 2000);
      const parsed = parseMensio(text);
      const n = applyMensio(parsed);
      $("ocr-status").textContent = (n ? "Filled " + n + " field(s) from PDF. Check every number.\n" : "No Size fields mapped from PDF. Paste text.\n") + text.slice(0, 400);
    } catch (err) {
      $("ocr-status").textContent = "Could not parse PDF. Paste measurements. " + err.message;
    }
  }
}
