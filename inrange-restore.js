function mensioInRange(v, min, max) {
  return Number.isFinite(v) && v >= min && v <= max;
}
function fixDec(v, min, max) {
  if (!Number.isFinite(v)) return null;
  if (mensioInRange(v, min, max)) return v;
  if (mensioInRange(v / 10, min, max)) return +(v / 10).toFixed(1);
  return null;
}
function inRange(v, r) {
  return v != null && r && r.length >= 2 && v >= r[0] && v <= r[1];
}
