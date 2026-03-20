# Metrics Primer

What to measure when evaluating product flows, and why each metric matters. Metrics provide objective grounding for findings that might otherwise be subjective.

## Metric Categories

### 1. Step Timing (Latency)

**What**: The time elapsed between a user action and the system's visible response.

**Why**: Latency directly affects perceived quality. Users form subconscious judgments about reliability based on speed.

**Thresholds**:

| Duration | Perception | Guidance |
|---|---|---|
| < 100ms | Instantaneous | Ideal for direct manipulation (typing, dragging, toggling) |
| 100ms - 300ms | Fast | Acceptable for most interactions (button clicks, tab switches) |
| 300ms - 1s | Noticeable | Needs visual feedback (loading indicator, skeleton screen) |
| 1s - 3s | Slow | Requires progress indicator. Users may lose context. |
| 3s - 10s | Frustrating | Must show progress with estimation. Users may abandon. |
| > 10s | Broken | Users assume failure. Must provide cancel option and recovery path. |

**How to measure**:
- Timestamp at user action (click, submit, navigate)
- Timestamp at visible response (content rendered, confirmation shown)
- Delta = response - action

**What to report**:
- Median latency per step (p50)
- Tail latency per step (p95) — captures worst-case experience
- Whether appropriate loading feedback is present for steps > 300ms

### 2. Error Rate Per Flow

**What**: The frequency at which users encounter errors during a specific flow.

**Why**: High error rates indicate UX problems (confusing forms, unclear requirements) or system instability (server errors, race conditions). Even "handled" errors represent friction.

**Types of errors to track**:

| Error Type | Description | Example |
|---|---|---|
| Validation error | User input rejected by the system | "Invalid email format" |
| System error | Backend failure surfaced to the user | 500 page, timeout message |
| Silent error | Operation fails without user notification | Form submits but data is not saved |
| Dead end | User reaches a state with no available action | 404 page with no navigation |
| Misleading success | System reports success but the action did not complete | "Saved!" but changes are lost on reload |

**How to measure**:
- Count errors encountered per flow attempt
- Categorize by error type
- Track recovery rate (% of errors that lead to eventual task completion vs. abandonment)

**What to report**:
- Error rate = (flow attempts with at least one error) / (total flow attempts)
- Most common error per flow
- Recovery rate per error type
- Silent errors and misleading successes are always Critical findings regardless of rate

### 3. Visual Consistency

**What**: The degree to which the product's visual presentation follows its own design system and platform conventions.

**Why**: Inconsistency erodes trust and increases cognitive load. Users unconsciously rely on visual patterns to predict behavior — when patterns break, users hesitate.

**Dimensions to evaluate**:

| Dimension | What to check |
|---|---|
| Typography | Font family, size, weight, line height consistent across similar elements |
| Color | Brand colors, semantic colors (error = red, success = green) used consistently |
| Spacing | Padding, margins, gaps follow a consistent scale (4px, 8px, 16px, etc.) |
| Component style | Buttons, inputs, cards, modals look the same across all pages |
| Interaction style | Hover, focus, active, disabled states consistent across similar elements |
| Iconography | Same icon set throughout, consistent sizing, consistent meaning |
| Layout patterns | Similar pages use similar layouts (list views look alike, detail views look alike) |

**How to measure**:
- Compare screenshots across similar pages/states
- Identify deviations from the stated design system (if one exists)
- If no design system exists, identify the dominant pattern and flag deviations from it

**What to report**:
- List of inconsistencies with severity (Cosmetic for minor, Friction if it causes confusion)
- Screenshots or visual diffs where possible
- Reference to the dominant pattern or design system spec

### 4. Spec Compliance

**What**: Whether the implemented product matches its specification (design mocks, requirements documents, acceptance criteria).

**Why**: Deviations from spec may be intentional improvements or unintentional regressions. Tracking them ensures nothing falls through the cracks.

**Dimensions to evaluate**:

| Dimension | What to check |
|---|---|
| Functional | Does the feature do what the spec says? |
| Visual | Does the implementation match the design mock? |
| Copy | Is the text exactly as specified? |
| Behavioral | Do animations, transitions, and interactions match the spec? |
| Responsive | Does the implementation handle the breakpoints defined in the spec? |
| Edge cases | Does the implementation handle the edge cases described in the spec? |

**How to measure**:
- Side-by-side comparison of spec vs. implementation
- Checklist of acceptance criteria with pass/fail per item
- Deviation log: what differs, whether intentional or not

**What to report**:
- Compliance rate = (criteria met) / (total criteria)
- List of deviations with classification: intentional improvement, regression, or undetermined
- Deviations that affect user task completion are Critical regardless of spec status

### 5. Trend Direction

**What**: Whether a metric is improving, stable, or degrading over time.

**Why**: A single measurement is a snapshot. Trends reveal whether the product is getting better or worse, and whether interventions are working.

**How to track**:
- Record metrics at each evaluation run with a timestamp
- Compare current values against the previous run and the baseline (first run)
- Flag metrics that have changed by more than 10% in either direction

**Trend classifications**:

| Trend | Symbol | Definition |
|---|---|---|
| Improving | `+` | Metric has moved toward the target by > 10% since last run |
| Stable | `=` | Metric is within 10% of last run |
| Degrading | `-` | Metric has moved away from the target by > 10% since last run |
| New | `*` | No previous measurement exists for comparison |

**What to report**:
- Trend symbol next to every metric
- Highlight any metric that has degraded for two or more consecutive runs (sustained regression)
- Call out metrics that improved significantly (validates a recent change)

## Composite Scores

Individual metrics can be combined into higher-level scores for summary reporting.

### Flow Health Score

A per-flow score combining the key metrics:

```
flow_health = (
  completion_weight * completion_rate +
  latency_weight * latency_score +
  error_weight * (1 - error_rate) +
  consistency_weight * consistency_score
)
```

Default weights:
- Completion: 0.40
- Latency: 0.20
- Error rate: 0.25
- Consistency: 0.15

Latency score normalization:
- p50 < 300ms = 1.0
- p50 300ms - 1s = 0.75
- p50 1s - 3s = 0.50
- p50 3s - 10s = 0.25
- p50 > 10s = 0.0

### Product Health Score

The weighted average of all flow health scores, weighted by flow importance:

- **Primary flows** (core value delivery): weight 3
- **Secondary flows** (supporting tasks): weight 2
- **Tertiary flows** (settings, admin, edge features): weight 1

## Measurement Rules for the AI

1. **Always report units.** "Latency: 2.3" is meaningless. "Latency: 2.3s (p50)" is useful.
2. **Distinguish measured from estimated.** If a metric was directly observed, label it "measured." If inferred from indirect evidence, label it "estimated" with a confidence level.
3. **Missing data is not zero.** If a metric could not be collected, report it as "N/A" with an explanation, not as 0 or 100%.
4. **Report raw numbers alongside percentages.** "Error rate: 15% (3 of 20 attempts)" is more informative than "Error rate: 15%."
5. **Trends require at least two data points.** Do not report trends on the first evaluation run.
