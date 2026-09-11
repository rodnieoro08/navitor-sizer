# Navitor Vision decision tree
Personal / MDT decision support. Not IFU. Not a medical device.

Sources for ranges: Abbott Navitor Vision didactic TRN1006420 OUS VER A and published Navitor use-range tables.

## 0. Inputs

Required (at least one): annulus perimeter (mm), area (mm²), mean diameter (mm).

Used on every case if present: min/max diameter, STJ, SOV L/R/NC or min width, SOV height, LCA height, RCA height, LVOT, ascending aorta, access min diameter, annular / LVOT / STJ calcium grade.

## 1. Data-quality gate

- Perimeter-derived diameter = peri / π
- Area-derived diameter = 2 × √(area / π)
- If any pair of {peri-derived Ø, area-derived Ø, entered mean Ø} differs by > 2 mm → FLAG and lower confidence. Do not fight about 25 vs 27 on a bad trace.
- Ellipticity = min Ø / max Ø. IFU note: circular or elliptical geometry with ratio ≥ 0.73.

## 2. Hard exclude for a given size

Exclude that size if any of these fail (when the field was entered):

| Check | 23 | 25 | 27 | 29 | 35 |
|---|---|---|---|---|---|
| SOV min width | ≥25 | ≥27 | ≥29 | ≥31 | ≥34 |
| SOV height | ≥15 | ≥15 | ≥15 | ≥15 | ≥15 |
| Ascending aorta | 26–36 | 28–38 | 30–40 | 32–42 | 27–44 |

Also treat a size as not eligible if **none** of peri / area / mean Ø fall inside that size’s published range.

Access is a warning, not always an exclude (alternative access exists):
- 23 / 25 → vessel ≥ 5.0 mm
- 27 / 29 / 35 → vessel ≥ 5.5 mm

## 3. Published core ranges

| Size | Mean Ø | Area | Perimeter |
|---|---|---|---|
| 23 | 19–21 | 277–346 | 60–66 |
| 25 | 21–23 | 338–415 | 66–73 |
| 27 | 23–25 | 405–491 | 72–79 |
| 29 | 25–27 | 479–573 | 79–85 |
| 35 | 27–30 | 559–707 | 85–95 |

Inclusive at the printed edges. That is why 66, 72–73, 79 and 85 mm are two-size problems.

## 4. Score

For each non-excluded size:

```
score = 0.45 × periFit + 0.35 × areaFit + 0.20 × meanFit
```

Fit is centrality inside the range (1.0 at the midpoint, 0 at the edge). Outside the range the term is negative.

Then subtract (mainly from the larger of two overlapping sizes):

| Condition | Penalty |
|---|---|
| Min(LCA, RCA) < 10 mm | −0.35 |
| Min(LCA, RCA) 10–12 mm | −0.15 |
| SOV width < 2 mm above that size’s floor | −0.18 |
| STJ < labelled valve diameter | −0.15 |
| Ellipticity < 0.73 | −0.15 |
| LVOT meaningfully < annulus mean | −0.08 |
| STJ calcium moderate / severe | −0.10 / −0.22 |
| Severe LVOT calcium | −0.10 |
| Severe annular calcium | −0.08 |
| Access below FlexNav minimum | −0.20 |

## 5. Pick

- Eligible sizes sorted by score.
- If top two scores differ by < 0.08 → **co-primary**. Do not force a single size.
- Otherwise primary = top score; list other eligible sizes as “also compatible”.
- Confidence:
  - High: ≥2 core ranges match, no co-primary, few flags
  - Moderate: overlap edge, only one core range, or important flags
  - Low: no size fully eligible

## 6. Boundary playbook

### 66 mm perimeter — 23 vs 25
Prefer **25** when area ≥ 338, mean Ø ≥ 21, SOV ≥ 27, coronaries comfortable, STJ not tight.
Prefer **23** when area still lives in 277–346, SOV < 27 or only just 27, LCA/RCA low, STJ calcium moderate+, or ellipticity < 0.73 with a small min diameter.

### 72–73 mm — 25 vs 27
27 needs SOV ≥ 29 and usually access ≥ 5.5.
If area ≤ 415 and mean Ø ≤ 23, 25 is usually the cleaner IFU match.
If area is already in 405–491 and mean Ø ≥ 23, 27 is preferred unless coronaries / STJ argue down.

### 79 mm — 27 vs 29
29 needs SOV ≥ 31 and AA 32–42.
Do not upsize off a single 79 mm peri if coronaries are low or STJ < 29.

### 85 mm — 29 vs 35
35 needs SOV ≥ 34 and labelled mean Ø 27–30.
35 AA window is wide (27–44). Still respect sinus width and coronary height.

## 7. Never

- Never auto-pick a size that failed a hard SOV / SOV-height / AA filter.
- Never treat a photo of a 3mensio monitor as a measurement.
- Never skip virtual valve / VTC in 3mensio when obstruction is the question.
- Never apply this tree to ViV, bicuspid-specific algorithms, or non-Navitor valves.
- Never let the app replace the Heart Team.
