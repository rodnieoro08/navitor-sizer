/* Restrict sticker OCR to REF + SN/LOT + expiry only. Loaded after case.js. */
function extractDevicesFromText(text) {
  const devices = { valve: {}, delivery: {}, loading: {} };
  findUdis(text).forEach((udi) => {
    const p = parseUDI(udi);
    if (!p.kind) {
      if (p.sn) p.kind = "valve";
      else if (p.lot && !devices.delivery.lot) p.kind = "delivery";
    }
    if (!p.kind || !devices[p.kind]) return;
    if (p.ref) devices[p.kind].ref = p.ref;
    if (p.sn && p.kind === "valve") devices.valve.sn = p.sn;
    if (p.lot && p.kind !== "valve") devices[p.kind].lot = p.lot;
    if (p.exp) devices[p.kind].exp = p.exp;
  });
  findRefs(text).forEach((r) => {
    devices[r.kind].ref = devices[r.kind].ref || r.ref;
  });
  const lots = [...text.matchAll(/\bLOT\s*[:#]?\s*([A-Z0-9\-]{5,})/ig)];
  if (lots[0] && devices.delivery.ref && !devices.delivery.lot) devices.delivery.lot = lots[0][1];
  if (lots[1] && devices.loading.ref && !devices.loading.lot) devices.loading.lot = lots[1][1];
  const sns = [...text.matchAll(/\b(?:SN|S\/N|SERIAL)\s*[:#]?\s*([A-Z0-9\-]{6,})/ig)];
  if (sns[0] && devices.valve.ref && !devices.valve.sn) devices.valve.sn = sns[0][1];
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
      if (!id || !d[k] || !$(id) || $(id).value) return;
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
