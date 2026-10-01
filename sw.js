const CACHE = "navitor-sizer-v36";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./case.js", "./peri-pd.js", "./ocr-strict.js", "./mensio-ocr.js", "./result-fix.js", "./fit-color.js", "./inrange-restore.js", "./manifest.json", "./icon.svg", "./navitor-dimensions.jpg", "./navitor-table.jpg", "./navitor-valve.jpg",
  "./frag-size-tail.html", "./frag-case-a.html", "./frag-case-b.html", "./frag-result.html", "./frag-charts.html", "./frag-logic.html", "./frag-nav.html"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
