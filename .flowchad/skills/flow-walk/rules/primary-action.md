<!-- prefix: FOLD -->
# The primary action and the fold

Each step has one thing the person must do: an input to fill, a button to
press. That thing is judged in two viewports, 375 × 812 px and 1440 × 900 px,
in the same session, without scrolling. Everything else on the screen is
secondary to it.

The **primary element** of a step is the first input the step needs: the
step's `primary` selector in the flow file, or else the first field the walk
fills on that screen. It is not the submit button; a step with no input at
all (a confirmation, a result) uses its primary button.

### FOLD-01 · The first input is visible without scrolling

- **Rule:** The first input a step needs is fully visible without scrolling in a 375 × 812 px viewport and in a 1440 × 900 px viewport.
- **Check:** In each viewport, before scrolling, measure how far the bottom of the primary element (the first input, not the submit button) sits below the viewport (`scroll_before_primary_vh`, from `scripts/measure.mjs`). Fail if it is above 0 in either viewport, or the element is hidden.
- **Measure:** `scroll_before_primary_vh`
- **Threshold:** `scroll_before_primary_vh = 0`
- **Severity:** blocker
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Scrolling and Attention" (2018), <https://www.nngroup.com/articles/scrolling-and-attention/> (checked 2026-11-15): "users spent about 57% of their page-viewing time above the fold. 74% of the viewing time was spent in the first two screenfuls".
- **Basis:** field — failed on 2 screens in 1 product, one of them rated "good" by a walk that had no fold check (maintainer field note, 2026-11; FN-2026-11-05).
- **Threshold source:** <https://www.nngroup.com/articles/scrolling-and-attention/> (checked 2026-11-15): the attention shares motivate the threshold; zero scroll in these two viewports is FlowChad's own standard, not a number from the source.
- **Pass:** A setup step shows a one-line explanation and the input at the top of the main column; the help text sits in a side column at 1440 and below the button at 375.
- **Fail:** A setup step shows a large status report first, which pushes the only input the step needs below the fold at 375 and halfway down at 1440.
- **Since:** 0.5.0

### FOLD-02 · Secondary content sits beside or below

- **Rule:** In the main column, explanations, reports, scores and progress steppers sit beside or below the step's primary input.
- **Check:** At each width, list what appears above the primary input inside the main column, in reading order; the site header, navigation and breadcrumbs outside the main column do not count. Fail if anything other than the step's heading, a one-line purpose and a back link comes first.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Progressive Disclosure" (2006), <https://www.nngroup.com/articles/progressive-disclosure/> (checked 2026-11-15): "Progressive disclosure defers advanced or rarely used features to a secondary screen".
- **Pass:** Under the site header, a payment step's main column starts with the card form; the order summary is in a right-hand column at 1440 and collapsed under the form at 375.
- **Fail:** A payment step's main column shows a five-row order summary, a progress stepper and a security note before the card form.
- **Since:** 0.5.0

### FOLD-03 · One dominant action

- **Rule:** Each task screen has exactly one visually dominant action, and every other action is visibly quieter.
- **Check:** Count the actions styled as primary (filled, high-contrast or largest) in the main column. Fail if there are none or more than one.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — GOV.UK Design System, "Button", <https://design-system.service.gov.uk/components/button/> (checked 2026-11-15): "Avoid using multiple default buttons on a single page. Having more than one main call to action reduces their impact".
- **Basis:** source — Steve Krug, "Steve Krug on Things that Make Us Think" (Peachpit, 2014, excerpt from *Don't Make Me Think, Revisited*), <https://www.peachpit.com/articles/article.aspx?p=2209309> (checked 2026-11-15): "the tradeoffs should usually be skewed further in the direction of 'Obvious' than we think."
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
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 1.4.10 Reflow (2023), <https://www.w3.org/TR/WCAG22/#reflow> (checked 2026-11-15): content is presented "without requiring scrolling in two dimensions" at a width equivalent to 320 CSS pixels.
- **Basis:** field — failed on 1 screen in 1 product, only after an error message appeared (maintainer field note, 2026-11; FN-2026-11-06).
- **Threshold source:** <https://www.w3.org/TR/WCAG22/#reflow> (checked 2026-11-15): no horizontal scroll at 320 CSS pixels; 375 is FlowChad's narrow test width, wider than the criterion's.
- **Pass:** A long shared-file link wraps or scrolls inside its own box at 375 while the page stays put.
- **Fail:** A long shared-file link pushes the page wider than the screen at 375 once an inline error appears under it.
- **Since:** 0.5.0
