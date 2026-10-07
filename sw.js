const CACHE = "navitor-sizer-v48";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./case.js", "./mensio-ocr.js", "./manifest.json", "./icon.svg", "./navitor-dimensions.jpg", "./navitor-table.jpg", "./navitor-valve.jpg", "./navitor-ref-1.jpg", "./navitor-ref-2.jpg", "./navitor-ref-3.jpg", "./navitor-ref-4.jpg",
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
