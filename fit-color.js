function colorFitMatrix(r) {
  if (!document.getElementById("fit-colors")) {
    var st = document.createElement("style");
    st.id = "fit-colors";
    st.textContent = "#result-body tr.fit-green{background:rgba(61,214,140,.28)}#result-body tr.fit-green td{color:#e7fff3;font-weight:700}#result-body tr.fit-yellow{background:rgba(240,180,41,.30)}#result-body tr.fit-yellow td{color:#fff4d2;font-weight:700}#result-body tr.fit-red{background:rgba(255,107,122,.18)}#result-body tr.fit-red td{color:#ffd0d6}";
    document.head.appendChild(st);
  }
  var table = document.querySelector("#result-body table");
  if (!table || !r || !r.evals) return;
  var rows = table.querySelectorAll("tbody tr");
  var eligible = r.evals.filter(function (e) { return e.eligible; }).sort(function (a, b) { return b.score - a.score; });
  var ranked = r.evals.slice().sort(function (a, b) { return b.score - a.score; });
  var both = eligible.length >= 2;
  var green = !both && eligible.length ? eligible[0].size.size : null;
  var yellow = {};
  if (both) {
    yellow[eligible[0].size.size] = 1;
    yellow[eligible[1].size.size] = 1;
  } else {
    var second = null;
    for (var i = 0; i < ranked.length; i++) {
      if (ranked[i].size.size !== green) { second = ranked[i]; break; }
    }
    if (second) yellow[second.size.size] = 1;
  }
  rows.forEach(function (tr) {
    var size = parseInt(tr.cells[0].textContent.replace(/[^0-9]/g, ""), 10);
    tr.classList.remove("fit-green", "fit-yellow", "fit-red", "hl");
    if (yellow[size]) tr.classList.add("fit-yellow");
    else if (size === green) tr.classList.add("fit-green");
    else tr.classList.add("fit-red");
  });
}
var previousGo = navitorGo;
navitorGo = function () {
  previousGo();
  if (window.__lastRec) colorFitMatrix(window.__lastRec);
};
