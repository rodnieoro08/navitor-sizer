# Navitor Vision decision tree
Personal / MDT decision support. Not IFU. Not a medical device.

Sources for ranges: Abbott Navitor Vision didactic TRN1006420 OUS VER A and published Navitor use-range tables.

## 0. Inputs

The decision needs a **perimeter** (mm). A perimeter-derived diameter typed on its own is also accepted.
Area and mean diameter are optional and are used as checks only.

Also used when present: min/max diameter, STJ, SOV L/R/NC or SOV min width, LCA height, RCA height, LVOT, ascending aorta, access min diameter, annular / LVOT / STJ calcium grade.

SOV height is **not** used. The IFU range table (ARTMT600362847, Table 2) has no SOV height criterion and the field was removed from the Size tab.

## 1. Data-quality checks (flags only, never change the size)

- Perimeter-derived diameter = peri / π (shown to 1 decimal)
- Area-derived diameter = 2 × √(area / π)
- Each of these raises a "Measurement check" flag and drops confidence from High to Moderate:
  - peri-derived Ø vs area-derived Ø differ by > 2 mm (needs peri and area)
  - peri-derived Ø vs entered mean Ø differ by > 2 mm (needs peri and mean)
  - (min Ø + max Ø) / 2 vs entered mean Ø differ by > 1.5 mm (needs all three)
- The app does **not** currently compare area-derived Ø directly with entered mean Ø when they disagree with each other but both agree with the perimeter-derived Ø. (The Logic tab wording implies it does. Known gap, behaviour left unchanged.)
- Ellipticity = min Ø / max Ø. IFU note: circular or elliptical geometry with ratio ≥ 0.73. Below 0.73 is a score penalty (section 4), not a data-quality flag.

## 2. Eligibility for a given size

A size is **eligible** only if it passes both gates.

**Gate A — perimeter in range (the core).** The entered perimeter lies inside that size's perimeter range (section 3, inclusive at both ends). If only a perimeter-derived diameter was typed (no perimeter), that diameter (1 decimal) must lie inside the size's annulus-diameter band instead. Area and entered mean Ø never make a size eligible or ineligible.

**Gate B — hard excludes** (applied only when the field was entered). Exclude that size if any fail:

| Check | 23 | 25 | 27 | 29 | 35 |
|---|---|---|---|---|---|
| SOV min width (min of L/R/NC, or SOV min field) | ≥25 | ≥27 | ≥29 | ≥31 | ≥34 |
| Ascending aorta | 26–36 | 28–38 | 30–40 | 32–42 | 27–44 |
| Min(LCA, RCA) height | ≥10 | ≥10 | ≥10 | ≥10 | ≥10 |

The 10 mm coronary minimum is a local rule, not an IFU criterion. There is no separate 10–12 mm "borderline" penalty.

Access is a warning plus a score penalty, not an exclude (alternative access exists):
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

Computed for every size, used to rank the **eligible** sizes:

```
periFit = centrality(perimeter, size perimeter range)
pdFit   = centrality(peri / π, size annulus-diameter band)      (band = the "Mean Ø" column in section 3)

score = 0.70 × max(0.15, periFit)      if perimeter is in range
      + 0.30 × max(0.15, pdFit)        if peri / π (rounded to 1 dp) is in the band
      − penalties
```

Centrality is 1.0 at the midpoint of a range and 0 at its edge. (If the perimeter is out of range the size is not eligible, so its score does not matter.) Area and entered mean Ø do **not** enter the score.

Penalties:

| Condition | Penalty |
|---|---|
| Access below FlexNav minimum for that size | −0.20 |
| SOV width at or above the floor but < 2 mm above it | −0.18 |
| STJ < labelled valve diameter | −0.15 |
| Ellipticity < 0.73 | −0.15 |
| LVOT + 1.5 mm < entered mean Ø | −0.08 |
| STJ calcium moderate / severe | −0.10 / −0.22 |
| Severe LVOT calcium | −0.10 |
| Severe annular calcium | −0.08 |

Review flags with no score effect:
- Area outside that size's area band, shown only when the perimeter is in range for that size ("does not change the perimeter decision")
- Entered mean Ø outside that size's mean-Ø band, shown only when the perimeter is in range for that size ("perimeter decides")
- Perimeter-derived Ø outside that size's band (shown for any size where it falls outside)

## 5. Pick

- Eligible sizes sorted by score.
- If top two scores differ by < 0.08 → **co-primary**. Do not force a single size.
- Otherwise primary = top score; other eligible sizes are listed as "also compatible".
- Boundary perimeters 66, 72, 73, 79, 85 (within 0.05 mm) and anything in 72–73 are labelled as a boundary between the two neighbouring sizes.
- Confidence:
  - High: no co-primary, not a boundary perimeter, fewer than 2 review flags on the primary, no measurement check flags
  - Moderate: co-primary, boundary perimeter, ≥ 2 flags on the primary, or any measurement check flag
  - Low: no size eligible (nearest sizes and their hard-exclude reasons are shown, no recommendation)
- No perimeter and no perimeter-derived diameter → no size can be eligible. With no perimeter, area only returns an error message and mean Ø only returns "no size".

Fit matrix colours on the Result tab: green = the single eligible (recommended) size; yellow = the second-highest-scoring size, or both sizes when two are eligible; red = everything else.

## 6. Boundary playbook

Reviewer guidance for reading the flags at an overlap. The app does not apply these as rules: it uses perimeter, perimeter-derived Ø, the hard excludes and the penalties above. Area and entered mean Ø appear only as flags.

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

- Never auto-pick a size that failed a hard SOV width / ascending aorta / coronary height filter.
- Never treat a photo of a 3mensio monitor as a measurement.
- Never skip virtual valve / VTC in 3mensio when obstruction is the question.
- Never apply this tree to ViV, bicuspid-specific algorithms, or non-Navitor valves.
- Never let the app replace the Heart Team.
