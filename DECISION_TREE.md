# Navitor Vision decision tree
Personal / MDT decision support. Not official Abbott software. Not IFU. Not a medical device. Not CE/UKCA marked. The Heart Team decides.

Sources for ranges: Abbott Navitor Vision didactic TRN1006420 OUS VER A and published Navitor use-range tables.

## 0. Inputs

The decision needs a **perimeter** (mm). A perimeter-derived diameter typed on its own is also accepted.
Area and mean diameter are optional and are used as checks only.

Also used when present: min/max diameter, STJ, SOV L/R/NC or SOV min width, LCA height, RCA height, LVOT, ascending aorta, access min diameter, annular / LVOT / STJ / cusp calcium grade, and (Field logic only) four optional toggles: eccentric leaflet calcium, protruding LVOT calcium, RBBB / short membranous septum / heavy septal calcium, small patient / low expected EOA (PPM concern).

SOV height is **not** used: not asked for, not scored, not flagged. The IFU range table (ARTMT600362847, Table 2) has no SOV height criterion, real-world users do not measure it, and the field was removed from the Size tab. SOV **diameter** is the root measurement used.

## Logic modes

The Logic tab has a switch, remembered on the phone (localStorage `navitorLogic`):

- **Field logic (shared edges)**: default since v49. Rodnie's field logic, not an Abbott claim. Section 6.
- **Classic**: the pre-v49 behaviour (tag `old-logic-v48`). Sections 5 and 7.

Both modes are identical whenever the perimeter is inside one size's range only. They differ only on shared edges (66 · 72–73 · 79 · 85 mm). The Result tab shows which logic produced the result.

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

## 5. Pick (both modes; Classic at shared edges)

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

## 6. Field logic at shared edges (default)

Rodnie's field logic, not an Abbott claim. Heart Team decides.

Applies when the perimeter is inside **both** neighbours' perimeter ranges (66 · 72–73 · 79 · 85 mm). With no perimeter, a perimeter-derived diameter inside both annulus bands counts the same way. Single-size perimeters use section 5 unchanged.

**The smaller valve is the default.** The other valve is shown as the alternative. Confidence is Moderate. A flag reads e.g. `Shared edge 23/25: default 23` or `Shared edge 23/25: stepped up to 25`. Oversizing is shown for both candidates: π × label ÷ perimeter − 1 (66 mm: 23 ≈ 9.5 %, 25 ≈ 19 %).

Tie-breakers, in rank order. Each is shown on the Result as *favours smaller / favours larger / neutral / veto larger / not entered*:

1. **Calcium burden & distribution (first).** Supports the larger: cusp or annular calcium moderate/severe, eccentric leaflet calcium, or LVOT calcium moderate/severe (not protruding). **Protruding LVOT calcium = veto larger** (rupture and conduction risk). None/mild = neutral.
2. **Annular area as a check on perimeter.** Area < larger size's area minimum → perimeter flatters the larger (eccentric annulus) → **veto larger**. Area inside both ranges → neutral. Area > smaller size's area maximum → the smaller has been left → favours larger.
3. **SOV diameter.** Mean of L/R/NC, then the smallest sinus. Smallest < larger size's floor → **veto larger** (already a hard exclude). Mean or smallest < larger floor + 2 mm → **tight** for the larger (the frame is built larger than its label). **Genuinely uniform** = all three sinuses entered and max − min ≤ 2 mm. "SOV min width only" cannot confirm uniformity. No SOV entered = root not confirmed, treated as tight. A single narrow sinus keeps the smaller valve.
4. **LVOT vs annulus.** LVOT < perimeter-derived diameter (1 dp) → constrains the larger inflow → favours smaller and blocks a step-up.
5. **Coronary height & STJ.** Veto a size more often than they choose one. Any non-SOV hard exclude on the larger (coronary < 10 mm, ascending aorta window) → veto larger. STJ < larger label → favours smaller but does not block a step-up; if the app steps up anyway, it shows an "STJ alert" flag.
6. **Conduction risk vs PPM.** RBBB / short membranous septum / heavy septal calcium → favours smaller and a higher implant, blocks a step-up. Small patient / low expected EOA → favours larger only if the root can take it (no veto, SOV entered and not tight).

Decision:

- Any veto larger → **smaller**.
- SOV tight (or not entered) → **smaller**, unless ALL of: calcium more than mild, area entered and ≥ larger's area minimum, LVOT entered and not smaller than the annulus, three uniform sinuses, no conduction-risk toggle.
- SOV roomy → **step up** when (calcium supports it, or area > smaller's area maximum, or PPM concern) AND LVOT is not smaller than the annulus AND no conduction-risk toggle. Otherwise smaller.
- If the smaller valve fails a hard limit and the larger passes, the larger is the only option.

### Worked example: 66 mm perimeter, SOV 27 mm

23 (60–66) and 25 (66–73) share the 66 mm edge. Perimeter-derived Ø 21.0 mm; a circular 66 mm annulus ≈ 346.6 mm². Oversizing ≈ 9.5 % for the 23 and ≈ 19 % for the 25. A 27 mm sinus is tight for a 25 (floor 27, tight below 29).

| Case | Result |
|---|---|
| (a) SOV 27/27/27, nothing else | 23 |
| (b) + cusp moderate, area 360, LVOT 21.5, SOV 27/27/27.5 | 25 |
| (c) as (b), SOV 27/27/31 (spread 4 mm) | 23 |
| (d) as (b), SOV min width 27 only | 23 |
| (e) as (b), LVOT 19 | 23 |
| (f) as (b), area 330 (< 338) | 23 |

The same pattern is tested at 72.5, 79 and 85 mm (`tests/harness.js`).

## 7. Classic boundary playbook

Classic mode only. Reviewer guidance for reading the flags at an overlap. The app does not apply these as rules: it uses perimeter, perimeter-derived Ø, the hard excludes and the penalties above. Area and entered mean Ø appear only as flags.

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

## 8. Never

- Never auto-pick a size that failed a hard SOV width / ascending aorta / coronary height filter.
- Never treat a photo of a 3mensio monitor as a measurement.
- Never skip virtual valve / VTC in 3mensio when obstruction is the question.
- Never apply this tree to ViV, bicuspid-specific algorithms, or non-Navitor valves.
- Never let the app replace the Heart Team.
