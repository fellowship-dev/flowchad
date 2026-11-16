---
name: flow-diff
description: Compare walk snapshots to detect regressions and improvements — visual diff, timing changes, broken/fixed steps. Usage /flow-diff <flow-name>
user_invocable: true
---

# Flow Diff

Compare the latest walk snapshot against previous runs to detect regressions and improvements.

## Usage

```
/flow-diff sign-up              # latest vs previous
/flow-diff sign-up --history 5  # trend over last 5 runs
```

## Process

### 1. Find Snapshots

List all snapshot directories for the flow:
```bash
ls -d .flowchad/snapshots/*-{flow-name} | sort
```

Snapshots are matched by flow id (the filename). If the flow lists `previously:` ids, include their snapshots too.

Need at least 2 snapshots to diff. If only 1 exists, tell the user to walk again after making changes.

### 2. Load Results

Read `results.json` from the two most recent snapshots (or N for `--history`). If the two walks ran on different surfaces (for example `read-only-live` vs `local-copy`), say so at the top: differences may come from the surface, not the product.

### 3. Compare Step-by-Step

For each step, compare across snapshots:

| Check | Method | Alert |
|-------|--------|-------|
| **Status change** | Compare `status` field | Any change (pass↔fail, pass↔error) |
| **Timing regression** | Compare `timing_ms` | >50% slower than previous |
| **Timing improvement** | Compare `timing_ms` | >25% faster than previous |
| **New failure** | Step was pass, now fail/error | Always alert |
| **Fixed** | Step was fail/error, now pass | Always note (positive) |
| **New step** | Step exists in latest, not in previous | Note (flow changed) |
| **Removed step** | Step in previous, not in latest | Note (flow changed) |
| **Goal** | Compare `goal_reached` and `stopped_at` | Any change; "now reaches its goal" is the headline improvement |
| **Effort** | Compare `counts` (typed fields, clicks, time to first value) | Any change |
| **Errors** | Compare `console_errors` / `failed_requests` per step | New errors |
| **Measures** | Compare the gate's flow measures (`node flow-gate/scripts/gate.mjs latest --previous prev --json`): screens, decisions, fields, clicks, words, scroll before the primary action per width, non-task elements, waits, dead ends, loops, time to value | Any measure that got worse; fewer is the improvement to report |
| **Rules** | Compare `rule_results` failures by rule id | New failures (regressions) and rules that now pass |

### 4. Visual Comparison

For steps with status changes or significant timing differences, present screenshots side-by-side:

```
### Step 3: click submit

| Before (Mar 18) | After (Mar 20) |
|---|---|
| step-03-click@1440.png | step-03-click@1440.png |
| ✓ pass, 1.2s | ✗ fail, timeout |
```

Screenshots are per width since 0.4.0 (`steps[].screenshots`, e.g. `{"1440": "step-03-click@1440.png", "375": "step-03-click@375.png"}`); older snapshots have a single `screenshot` such as `step-03-click.png`. Compare the same width on both sides, falling back to the single file for old snapshots, and include the narrow width when the difference only shows there.

Read both screenshots and describe the visual difference (e.g., "button is now disabled", "error modal appeared", "loading spinner stuck").

### 5. Trend Analysis (--history)

When multiple snapshots available, track trends:

```
### Timing Trend: step 1 (navigate /signup)

Run 1 (Mar 15): 1.2s
Run 2 (Mar 17): 1.4s
Run 3 (Mar 19): 2.1s ⚠️
Run 4 (Mar 20): 2.8s ⚠️⚠️
Trend: DEGRADING (+133% over 4 runs)
```

```
### Pass Rate Trend

Run 1: 4/4 (100%)
Run 2: 3/4 (75%)
Run 3: 4/4 (100%)
Run 4: 3/4 (75%)
Trend: UNSTABLE (flapping step 3)
```

### 6. Output

Print a diff report:

```markdown
## Flow Diff: sign-up
**Comparing:** 2026-03-18 → 2026-03-20

### Regressions
- ⚠️ Step 3 (click submit): pass → fail (button not found)
- ⚠️ Step 1 (navigate): 1.2s → 2.8s (+133%, threshold: 2s)

### Improvements
- ✓ Step 2 (fill email): 0.8s → 0.15s (-81%)

### Unchanged
- Step 4 (fill password): pass, 0.12s (stable)

### Summary
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Pass rate | 100% | 75% | -25% |
| Total time | 3.5s | 5.9s | +69% |
| Slow steps | 0 | 2 | +2 |
```

Suggest `/flow-report sign-up` for detailed analysis of current state.
