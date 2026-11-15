# Measures

Every walk records the cost of reaching value as numbers, per step and per
flow, so the next walk can show whether a change made the path shorter. The
counts are what a person spends: screens, decisions, clicks, typing, words to
read, scrolling before they can act, things on screen they did not need, and
waiting.

A threshold appears only where a rule with a cited source sets one (see
`../rules/`); every other measure is compared with the previous walk of the
same flow. A number that gets worse needs a stated reason in the report.

## Where each number comes from

- **Measured** by `scripts/measure.mjs` in the page, at each width, right after
  the screenshot of that width.
- **Counted** by the walker while performing the step.
- **Judged** by the walker looking at the screen; record what was counted in
  the list next to the number (for example `non_task: ["plan badge", "promo
  banner"]`), so a reviewer can disagree with a specific item.
- **Computed** by `flow-gate/scripts/gate.mjs` from the step measures.

## Step measures (`steps[].measures`)

| Measure | How | What it counts |
|---|---|---|
| `decisions` | judged | Questions the person must answer on this screen. A group of answers that belong together is one. A prefilled value left alone is not a decision. |
| `fields` | counted | Inputs typed or pasted into. A pasted value is one field. |
| `clicks` | counted | Clicks or taps, including opening menus and dismissing things. |
| `words` | measured | Visible words in the main content (`main`, else the body). |
| `reading_time_s` | computed | `words / 238 * 60`, the average silent reading rate (Brysbaert, 2019). |
| `scroll_before_primary_vh` | measured | Per width: viewport heights between the top of the page and the bottom of the step's primary element. `0` means fully visible without scrolling. `null` if the element was not found or is hidden. |
| `horizontal_overflow_px` | measured | Per width: how many pixels the page is wider than the viewport. |
| `controls` | measured | Visible interactive elements on the screen (links, buttons, inputs). Context for `non_task_elements`. |
| `non_task_elements` | judged | Visible badges, banners, scores, widgets and secondary controls the step does not need. Fallbacks behind a link do not count. List them in `non_task`. |
| `wait_ms` | counted | Time from the action to the content the person came for, when over 300 ms. |
| `wait_feedback` | judged | Whether a spinner, skeleton or status text appeared within 1 second of the action. |
| `wait_progress` | judged | For waits over 10 s: whether progress, an estimate, or "you can leave this page" was shown. |
| `dead_end` | judged | The screen has no action toward the value moment. |
| `revisit` | judged | The screen or question was already completed in this walk and came back without the person asking. |

Per-width measures are objects keyed by width: `{"1440": 0, "375": 1.4}`.

## Flow measures (computed by the gate, `measures` in its output)

From the first step to the value step (`first_value: true`), inclusive. When
the value moment is not reached, the totals cover every step walked and the
report says so.

| Measure | How | What it counts |
|---|---|---|
| `screens_to_value` | computed | Distinct `screen` values (path, or the step's screen name). |
| `decisions_to_value` | computed | Sum of `decisions`. |
| `fields_to_value` | computed | Sum of `fields`. |
| `clicks_to_value` | computed | Sum of `clicks`. |
| `words_to_value` | computed | Sum of `words`, at the first width. |
| `reading_time_to_value_s` | computed | `words_to_value / 238 * 60`. |
| `max_scroll_before_primary_vh` | computed | Per width, the largest `scroll_before_primary_vh` on the path. |
| `non_task_elements_to_value` | computed | Sum of `non_task_elements`. |
| `waits` | computed | Number of steps with `wait_ms` over 1000. |
| `longest_wait_ms` | computed | The longest `wait_ms`. |
| `dead_ends` | computed | Steps with `dead_end: true`. |
| `loops` | computed | Steps with `revisit: true`. |
| `time_to_value_ms` | counted | From the first navigation to the value step, as `counts.time_to_first_value_ms`. |

## Docs and agent measures (`measures` in results.json, recorded directly)

| Measure | How | What it counts |
|---|---|---|
| `commands_to_install` | counted | Commands a fresh agent ran, from an empty folder to a working install. |
| `unanswered_questions` | counted | Questions the fresh agent could not answer from the docs. List them in `questions`. |
| `wrong_turns` | counted | Commands that failed or had to be changed, each with the doc line that misled. |

## Map measures (from `scripts/flowmap.mjs`)

A flow map has no screens to measure yet, so it gets the shape numbers only:
`screens_to_value`, `decisions_to_value`, `waits`, `dead_ends`, `loops`, and
`unreachable` (nodes that cannot be reached from the entry).

| Measure | How | What it counts |
|---|---|---|
| `unreachable` | computed | Map nodes with no path from the entry node. |

## Comparing walks

Compare a walk only with a walk of the same flow id, the same widths and the
same starting state (a fresh account, or the same seeded data). Say when the
surface differs (for example production against a local copy): differences
can come from the surface, not the product. A reference product walked the
same way gives a bar to beat, not a threshold.
