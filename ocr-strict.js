/* Group-sticker reader: one photo to valve / delivery / loading fields only. */
if (typeof GTIN_REF === "object") {
  Object.assign(GTIN_REF, {
    "05415067045805": { kind: "valve", ref: "NVRO-23" },
    "05415067036667": { kind: "loading", ref: "NVTR-LS-SM" },
    "05415067031372": { kind: "delivery", ref: "FNAV-DS-SM" }
  });
}

function yymmddToIso(s) {
  if (!s || !/^\d{6}$/.test(s)) return "";
  return "20" + s.slice(0, 2) + "-" + s.slice(2, 4) + "-" + s.slice(4, 6);
}

function normalizeStickerText(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/O(?=\d)/g, "0")
    .replace(/REF\s*/g, " REF ")
    .replace(/LOT\s*/g, " LOT ")
    .replace(/\bS\/N\b/g, " SN ")
    .replace(/SERIAL\s*/g, " SN ");
}

function extractDevicesFromText(text) {
  const devices = { valve: {}, delivery: {}, loading: {} };
  const raw = String(text || "");
  const t = normalizeStickerText(raw);
  const compact = raw.replace(/\s+/g, "");

  const refs = [
    { kind: "loading", re: /NVTR[\s\-]*LS[\s\-]*(SM|LG)/, make: (m) => "NVTR-LS-" + m[1] },
    { kind: "delivery", re: /FNAV[\s\-]*DS[\s\-]*(SM|LG)/, make: (m) => "FNAV-DS-" + m[1] },
    { kind: "valve", re: /NVRO[\s\-]*(23|25|27|29|35)/, make: (m) => "NVRO-" + m[1] },
    { kind: "valve", re: /NVTR[\s\-]*(23|25|27|29|35)/, make: (m) => "NVTR-" + m[1] }
  ];
  refs.forEach((r) => {
    const m = t.match(r.re);
    if (m) devices[r.kind].ref = devices[r.kind].ref || r.make(m);
  });

  const udiPatterns = [
    /\(01\)(\d{14})\(17\)(\d{6})\(21\)(\d{6,})/g,
    /\(01\)(\d{14})\(17\)(\d{6})\(10\)([A-Z0-9\-]+)/g,
    /01(\d{14})17(\d{6})21(\d{6,})/g,
    /01(\d{14})17(\d{6})10([A-Z0-9\-]+)/g
  ];
  udiPatterns.forEach((re, idx) => {
    let m;
    const src = idx < 2 ? compact : compact.replace(/[()]/g, "");
    while ((m = re.exec(src))) {
      const gtin = m[1];
      const exp = yymmddToIso(m[2]);
      const known = typeof GTIN_REF === "object" ? GTIN_REF[gtin] : null;
      let kind = known && known.kind;
      const payload = m[3] || "";
      if (!kind) kind = (idx % 2 === 0) ? "valve" : (devices.delivery.lot ? "loading" : "delivery");
      if (known && known.ref) devices[kind].ref = devices[kind].ref || known.ref;
      if (exp) devices[kind].exp = devices[kind].exp || exp;
      if (idx % 2 === 0) {
        if (kind === "valve") devices.valve.sn = devices.valve.sn || payload;
      } else if (kind !== "valve") {
        devices[kind].lot = devices[kind].lot || payload;
      }
    }
  });

  function pickDate(chunk) {
    const iso = chunk.match(/20[2-3]\d[-/.](?:0\d|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01])/);
    return iso ? iso[0].replace(/[/.]/g, "-") : "";
  }
  function pickLot(chunk) {
    const m = chunk.match(/LOT\s*[:#]?\s*([A-Z0-9]{6,})/);
    return m ? m[1] : "";
  }
  function pickSn(chunk) {
    const m = chunk.match(/SN\s*[:#]?\s*([A-Z0-9]{6,})/);
    return m ? m[1] : "";
  }
  function windowAround(token) {
    const i = t.indexOf(token);
    if (i < 0) return "";
    return t.slice(Math.max(0, i - 60), i + token.length + 90);
  }

  if (devices.loading.ref) {
    const w = windowAround("NVTR-LS") || windowAround("LOADING");
    devices.loading.lot = devices.loading.lot || pickLot(w) || pickLot(t);
    devices.loading.exp = devices.loading.exp || pickDate(w);
  }
  if (devices.delivery.ref) {
    const w = windowAround("FNAV-DS") || windowAround("DELIVERY");
    devices.delivery.lot = devices.delivery.lot || pickLot(w);
    devices.delivery.exp = devices.delivery.exp || pickDate(w);
  }
  if (devices.valve.ref) {
    const w = windowAround(devices.valve.ref) || windowAround("NVRO") || windowAround("VALVE");
    devices.valve.sn = devices.valve.sn || pickSn(w) || pickSn(t);
    devices.valve.exp = devices.valve.exp || pickDate(w);
  }
  return devices;
}

function applyDevices(devices) {
  const allowed = {
    valve: { ref: "vRef", sn: "vSn", exp: "vExp" },
    delivery: { ref: "dRef", lot: "dLot", exp: "dExp" },
    loading: { ref: "lRef", lot: "lLot", exp: "lExp" }
  };
  let filled = 0;
  Object.entries(allowed).forEach(([kind, ids]) => {
    const d = devices[kind] || {};
    Object.entries(ids).forEach(([k, id]) => {
      if (!id || !d[k] || !$(id)) return;
      if ($(id).tagName === "SELECT") {
        const opt = [...$(id).options].find((o) => o.value === d[k]);
        if (!opt) return;
        $(id).value = d[k];
      } else {
        $(id).value = d[k];
      }
      filled++;
    });
  });
  return filled;
}
