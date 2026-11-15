<!-- prefix: FOLD -->
# The primary action and the fold

Each step has one thing the person must do: an input to fill, a button to
press. That thing is judged at 375 and 1440 wide, in the same session, without
scrolling. Everything else on the screen is secondary to it.

The primary action of a step is the step's `primary` selector in the flow
file, or else the element the next step acts on.

### FOLD-01 · The primary action is visible without scrolling

- **Rule:** The one input or primary action a step needs is fully visible without scrolling at 375 and at 1440 wide.
- **Check:** At each width, before scrolling, measure how far the bottom of the primary element sits below the viewport (`scroll_before_primary_vh`, from `scripts/measure.mjs`). Fail if it is above 0 at either width, or the element is hidden.
- **Measure:** `scroll_before_primary_vh`
- **Threshold:** `scroll_before_primary_vh = 0`
- **Severity:** blocker
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Scrolling and Attention" (2018), <https://www.nngroup.com/articles/scrolling-and-attention/>: people spent about 57% of page-viewing time above the fold and 74% in the first two screenfuls.
- **Basis:** field — failed on 2 screens in 1 product, one of them rated "good" by a walk that had no fold check (maintainer field note, 2026-11).
- **Pass:** A setup step shows a one-line explanation and the input at the top of the main column; the help text sits in a side column at 1440 and below the button at 375.
- **Fail:** A setup step shows a large status report first, which pushes the only input the step needs below the fold at 375 and halfway down at 1440.
- **Since:** 0.5.0

### FOLD-02 · Secondary content sits beside or below

- **Rule:** Explanations, reports, scores and progress steppers sit beside or below the step's primary input, never above it.
- **Check:** At each width, list what appears above the primary element in reading order. Fail if anything other than the step's heading, a one-line purpose and the back link comes first.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Progressive Disclosure" (2006), <https://www.nngroup.com/articles/progressive-disclosure/>: show the features people need now first, and defer the rest to a secondary place.
- **Basis:** source — Adam Wathan and Steve Schoger, *Refactoring UI* (2018), <https://www.refactoringui.com/>: build hierarchy by de-emphasizing secondary content so the primary element stands out.
- **Pass:** A payment step shows the card form first; the order summary is in a right-hand column at 1440 and collapsed under the form at 375.
- **Fail:** A payment step shows a five-row order summary, a progress stepper and a security note before the card form.
- **Since:** 0.5.0

### FOLD-03 · One dominant action

- **Rule:** Each task screen has exactly one visually dominant action, and every other action is visibly quieter.
- **Check:** Count the actions styled as primary (filled, high-contrast or largest) in the main column. Fail if there are none or more than one.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Steve Krug, *Don't Make Me Think, Revisited* (3rd ed., 2014), <https://sensible.com/dont-make-me-think/>: a page should make the obvious next action self-evident.
- **Basis:** source — Adam Wathan and Steve Schoger, *Refactoring UI* (2018), <https://www.refactoringui.com/>: primary, secondary and tertiary actions get visibly different weight.
- **Pass:** A confirmation screen has one filled "Continue" button and a plain "Back" link.
- **Fail:** A confirmation screen has "Continue", "Save draft" and "Invite a teammate" as three identical filled buttons.
- **Since:** 0.5.0

### FOLD-04 · No sideways scroll at narrow widths

- **Rule:** No step scrolls sideways at 375 wide.
- **Check:** At 375, measure `document.documentElement.scrollWidth - clientWidth` (`horizontal_overflow_px`, from `scripts/measure.mjs`) after every step, including after error messages appear. Fail if it is above 0.
- **Measure:** `horizontal_overflow_px`
- **Threshold:** `horizontal_overflow_px = 0`
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 1.4.10 Reflow (2023), <https://www.w3.org/TR/WCAG22/#reflow>: content reflows without scrolling in two directions at a width of 320 CSS pixels.
- **Basis:** field — failed on 1 screen in 1 product, only after an error message appeared (maintainer field note, 2026-11).
- **Pass:** A long generated value wraps or scrolls inside its own box at 375 while the page stays put.
- **Fail:** A long generated value pushes the page wider than the screen at 375 once an inline error appears under it.
- **Since:** 0.5.0
