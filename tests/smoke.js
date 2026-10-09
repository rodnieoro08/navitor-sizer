/* Headless-Chrome smoke test: serves the repo root, loads the page, checks for
 * console/page errors, clicks the three example buttons + Recommend, checks the
 * case form initialises. Usage: node smoke.js [rootDir]   (needs google-chrome)
 * CDN scripts (pdf.js) may be unreachable offline; that is tolerated.            */
const puppeteer = require("puppeteer-core");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const chrome = process.env.CHROME || "/usr/bin/google-chrome";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXPECT = { mid27: "27", edge66: "23", edge79: "27" };   // from the baseline (live behaviour)

const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); r.end(b); });
}).listen(0, async () => {
  const fails = [], log = [];
  const ok = (c, m) => { log.push((c ? "PASS " : "FAIL ") + m); if (!c) fails.push(m); };
  const b = await puppeteer.launch({ executablePath: chrome, args: ["--no-sandbox", "--headless=new"], headless: true });
  const pg = await b.newPage();
  const errors = [], missing = [];
  pg.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  pg.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console.error: " + m.text()); });
  pg.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) missing.push(r.status() + " " + r.url()); });
  await pg.goto(`http://localhost:${srv.address().port}/index.html`);
  await sleep(2500);
  ok(await pg.evaluate(() => typeof init === "function" && typeof navitorGo === "function"), "init + navitorGo defined");
  ok(await pg.evaluate(() => !!document.getElementById("periPD")), "periPD field mounted");
  ok(await pg.evaluate(() => !!document.getElementById("cDate") && !!document.getElementById("cDate").value), "case form initialised (cDate defaulted)");
  ok(await pg.evaluate(() => document.querySelectorAll("#caN button").length === 4), "case cusp buttons built");
  ok(await pg.evaluate(() => document.querySelectorAll("#chart-ifus tr").length === 5), "charts table rendered");
  ok(await pg.evaluate(() => !document.getElementById("logicMode")), "no Classic / Field logic switch");
  ok(await pg.evaluate(() => !/Classic/.test(document.getElementById("mount-logic").textContent)), "Logic tab has no Classic section");
  ok(await pg.evaluate(() => !document.getElementById("result-logic")), "no Logic: line on Result");
  for (const ex of Object.keys(EXPECT)) {
    await pg.evaluate(() => { showScreen("input"); document.getElementById("btn-clear").click(); });
    await pg.click(`[data-ex=${ex}]`);
    await pg.click("#btn-go");
    const res = await pg.evaluate(() => ({
      size: (document.querySelector("#result-body .result-hero .size") || {}).textContent,
      pdRow: [...document.querySelectorAll("#result-body .why-row span")].some((s) => s.textContent === "Perimeter-derived diameter"),
      colours: [...document.querySelectorAll("#result-body tbody tr")].map((t) => [...t.classList].filter((c) => c.startsWith("fit-")).join("")),
      active: document.querySelector(".screen.active").id,
      overlap: !!document.querySelector("#result-body .overlap")
    }));
    ok(res.size && res.size.trim().startsWith(EXPECT[ex]), `${ex}: recommends ${EXPECT[ex]} (got ${res.size && res.size.trim()})`);
    ok(res.pdRow, `${ex}: perimeter-derived diameter row on Result`);
    ok(res.colours.every(Boolean), `${ex}: fit matrix coloured (${res.colours.join(",")})`);
    ok(res.active === "screen-result", `${ex}: Result screen shown`);
    ok(ex === "mid27" || res.overlap, `${ex}: overlap explanation ${res.overlap ? "shown" : "absent"}`);
  }
  ok(await pg.evaluate(() => /Perimeter-derived diameter/.test(document.getElementById("mount-logic").textContent)), "Logic fragment mounted");
  ok(await pg.evaluate(() => /Rodnie.s field logic, not an Abbott claim/.test(document.getElementById("mount-logic").textContent)), "field-logic disclaimer present");
  // Sinus height: optional, alert-only (< 15 mm), never changes the size
  ok(await pg.evaluate(() => !!document.getElementById("sovH")), "sinus height field present");
  for (const [h, alert] of [[12, true], [15, false]]) {
    await pg.evaluate(() => { showScreen("input"); document.getElementById("btn-clear").click(); });
    await pg.click("[data-ex=mid27]");
    await pg.evaluate((v) => { document.getElementById("sovH").value = String(v); }, h);
    await pg.click("#btn-go");
    const r = await pg.evaluate(() => ({ size: (document.querySelector("#result-body .result-hero .size") || {}).textContent, alert: /Coronary risk \(alert only\)/.test(document.getElementById("result-body").textContent) }));
    ok(r.size && r.size.trim().startsWith("27") && r.alert === alert, `sinus height ${h} mm: size 27 unchanged, alert ${alert ? "shown" : "absent"} (got ${r.size && r.size.trim()}, ${r.alert})`);
  }
  ok(await pg.evaluate(() => /moderate to severe/.test(document.getElementById("tPpm").textContent)), "PPM chip renamed");
  ok(errors.length === 0, "no console/page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  ok(missing.length === 0, "no 4xx on local assets" + (missing.length ? ": " + missing.join(" | ") : ""));
  await b.close(); srv.close();
  console.log(log.join("\n")); process.exit(fails.length ? 1 : 0);
});
