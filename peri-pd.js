(function () {
  function mount() {
    var peri = document.getElementById("peri");
    if (!peri) return;
    if (!document.getElementById("periPD")) {
      var wrap = document.createElement("div");
      wrap.className = "field";
      wrap.innerHTML = '<label>Perimeter-derived diameter <span class="unit">mm</span></label>' +
        '<input id="periPD" inputmode="decimal" readonly placeholder="peri ÷ π">';
      var area = document.getElementById("area");
      if (area && area.closest(".field")) area.closest(".field").after(wrap);
      else peri.closest(".field").after(wrap);
    }
    function update() {
      var el = document.getElementById("periPD");
      if (!el) return;
      var p = parseFloat(peri.value);
      el.value = isFinite(p) && p > 0 ? (p / Math.PI).toFixed(1) : "";
      var cPd = document.getElementById("cPd");
      if (cPd && el.value) cPd.value = el.value;
    }
    peri.addEventListener("input", update);
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
