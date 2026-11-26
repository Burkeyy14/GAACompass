# UX Audit — GAA Compass

_Phase 3 audit: screen-by-screen findings and planned fixes._

---

## Today

**What works**
- Readiness ring + headline message is the right first thing to see
- PlannedCard items give clear daily context
- Quick-log grid is easy to tap

**Issues**
- `section-label` "Today's training" burns 30px of vertical space without adding information — the training cards are self-explanatory
- Large title area takes ~80px; on small phones (<375px) this pushes training below fold
- Load warning + training label stacks to 2 visual separators before the first action
- WeighInPrompt and FuelRow appear below the fold after multiple goal cards, reducing discoverability

**Fix applied**
- Remove `section-label` div; merge into the compact layout
- FuelRow moved up (after training, before load card) so fuel tracking is above fold when it matters

---

## Goals

**What works**
- `<details open={w.week === cur}>` already collapses non-current weeks
- Goal icon + progress bar gives instant status
- NewGoal flow with preview is excellent

**Issues**
- For a 12-week goal, weeks 1–5 are "done" — they still appear as closed `<details>` rows, adding visual clutter (~450px of folded rows the player never needs to open again)
- Past weeks showing in the UI creates the false impression the week plan is long and unmanageable

**Fix applied**
- Past weeks (week < currentWeek) are hidden by default
- "Show N completed weeks" toggle appears at the top of the week list when there are past weeks

---

## Progress

**What works**
- Recovery bars chart
- Load trend is actionable

**Issues**
- Four separate `ProGate` teaser cards make the screen feel like a paywall rather than a progress screen
- Each teaser card is visually heavy (~80px); four of them is 320px of upgrade prompts
- 3 headline stats (streak, best streak, sessions) are good; the existing card stays

**Fix applied**
- Replace 4 `ProGate` cards with 1 consolidated "Pro insights" card listing features and 1 CTA

---

## Settings

**What works**
- Profile form is thorough and well-structured (Phase 2 improved it)

**Issues**
- The settings sheet is one long scroll: feedback CTA → entire ProfileForm → subscription → account → data → legal disclaimer
- The ProfileForm alone is 60+ fields, making it hard to find account/data controls at the bottom
- Cognitive overload: too many things in one place

**Fix applied**
- Replace single long scroll with navigable sections: About you / Your game / Your week / Subscription / Account & data
- Each section expands in-place (no extra sheets) using `<details>` or inline expand
- "Send feedback" moved to its own prominent row at the top

---

## Train (Frees screen)

**What works**
- Pitch tap interaction is delightful
- Zone table is clean

**Issues**
- None critical; minor: sport toggle for dual players could be more prominent

---

## Planner

**What works**
- Day columns with activity chips is scannable
- Plan feedback banners are actionable

**Issues**
- None critical

---

## Check-in

**What works**
- 5 sliders complete in ~30s — right length
- Recovery score headline is clear

---

## Accessibility findings

- Many icon-only buttons lack `aria-label` (e.g., trash, back arrow, add-result)
- `<details>/<summary>` elements don't have `aria-expanded` (HTML native handles this but screen readers may need extra labels)
- Color contrast OK on both light and dark modes (high-contrast accent colors)

**Fix applied**: audit all icon-only `<button>` elements and add `aria-label` where missing.
