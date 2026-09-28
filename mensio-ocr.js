function parseMensio(text) {
  const t = String(text || "").replace(/,/g, " ");
  const pick = (re) => {
    const m = t.match(re);
    return m ? parseFloat(m[1]) : null;
  };
  return {
    peri: pick(/Perimeter(?!\s*Derived)[^0-9]{0,24}(\d+(?:\.\d+)?)/i),
    periPD: pick(/Perimeter\s*Derived[^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    area: pick(/Area(?!\s*Derived)[^0-9]{0,24}(\d+(?:\.\d+)?)/i),
    meanD: pick(/Aortic Annulus[\s\S]{0,180}?Average\s*[\u00d8\u00f8O]?[^0-9]{0,12}(\d+(?:\.\d+)?)/i)
         || pick(/Average\s*[\u00d8\u00f8O][^0-9]{0,12}(\d+(?:\.\d+)?)/i),
    minD: pick(/Aortic Annulus[\s\S]{0,120}?Min\s*[\u00d8\u00f8O]?[^0-9]{0,12}(\d+(?:\.\d+)?)/i),
    maxD: pick(/Aortic Annulus[\s\S]{0,160}?Max\s*[\u00d8\u00f8O]?[^0-9]{0,12}(\d+(?:\.\d+)?)/i),
    stj: pick(/STJ\s*[\u00d8\u00f8O][^0-9]{0,16}(\d+(?:\.\d+)?)/i)
      || pick(/Sinotubular Junction[\s\S]{0,80}?Average[^0-9]{0,12}(\d+(?:\.\d+)?)/i),
    lca: pick(/LCA\s*Height[^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    rca: pick(/RCA\s*Height[^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    aa: pick(/Asc(?:ending)?\.?\s*Aorta\s*[\u00d8\u00f8O][^0-9]{0,16}(\d+(?:\.\d+)?)/i)
     || pick(/Ascending Aorta[\s\S]{0,80}?Average[^0-9]{0,12}(\d+(?:\.\d+)?)/i),
    lvot: pick(/LVOT\s*[\u00d8\u00f8O][^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    sovH: pick(/Valsalva Height[^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    sovL: pick(/Sinus Of Valsalva[\s\S]{0,80}?Left[^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    sovR: pick(/Sinus Of Valsalva[\s\S]{0,120}?Right[^0-9]{0,16}(\d+(?:\.\d+)?)/i),
    sovNC: pick(/Sinus Of Valsalva[\s\S]{0,160}?Non[^0-9]{0,16}(\d+(?:\.\d+)?)/i)
  };
}

function applyMensio(p) {
  const map = {
    peri: "peri", periPD: "periPD", area: "area", meanD: "meanD",
    minD: "minD", maxD: "maxD", stj: "stj", lca: "lca", rca: "rca",
    aa: "aa", lvot: "lvot", sovH: "sovH", sovL: "sovL", sovR: "sovR", sovNC: "sovNC"
  };
  let n = 0;
  Object.entries(map).forEach(([k, id]) => {
    if (p[k] == null || !$(id)) return;
    $(id).value = p[k];
    n++;
  });
  if (typeof updatePeriPD === "function") updatePeriPD();
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
  $("ocr-status").textContent = "Reading " + file.name + "…";
  if (file.type.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    if ($("img-preview")) $("img-preview").innerHTML = `<img alt="upload" src="${url}">`;
    try {
      let text = "";
      if (typeof fileToCanvas === "function" && typeof ocrCanvas === "function") {
        $("ocr-status").textContent = "Reading 3mensio numbers from photo…";
        const { canvas } = await fileToCanvas(file);
        text = await ocrCanvas(canvas);
      }
      if ($("paste") && text && !$("paste").value) $("paste").value = text.slice(0, 2000);
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
      const parsed = parseMensio(text);
      const n = applyMensio(parsed);
      $("ocr-status").textContent = (text.slice(0, 400) || "No extractable PDF text.") + "\n\nAuto-filled " + n + " field(s). Check every number.";
    } catch (err) {
      $("ocr-status").textContent = "Could not parse PDF. Paste measurements. " + err.message;
    }
  }
}
