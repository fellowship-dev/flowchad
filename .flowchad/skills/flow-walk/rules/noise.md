<!-- prefix: NOISE -->
# Noise

Noise is everything on a task screen that the task does not need: badges,
banners, scores, widgets, extra buttons, paragraphs. Each one competes with
the primary action for the person's attention. Count it, then remove it or
move it behind a link.

A **non-task element** is a visible element on the step that the person does
not need to complete this step. Fallbacks behind a link do not count.

### NOISE-01 · Everything visible serves the step

- **Rule:** Every badge, banner, score, widget and secondary control visible on a task screen is needed for that step, and anything else is removed or moved behind a link.
- **Check:** At each width, list the visible elements in the main column and mark each one the step does not need (`non_task`, counted in `non_task_elements`). Fail the step for each element marked.
- **Measure:** `non_task_elements`
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 8, aesthetic and minimalist design, <https://www.nngroup.com/articles/ten-usability-heuristics/>: every extra unit of information competes with the relevant units and reduces their visibility.
- **Basis:** field — failed on 2 screens in 1 product (maintainer field note, 2026-11).
- **Pass:** An email confirmation screen shows the address the email went to, what to do next and one quiet "Not seeing it?" link.
- **Fail:** An email confirmation screen shows a plan badge, a "3 checks pending" score, a feedback widget and a promotion banner around the instruction.
- **Since:** 0.5.0

### NOISE-02 · Fallbacks hide behind one link

- **Rule:** Fallback paths such as resending, trying another way, a human check or contacting support sit behind one quiet link on the screen that needs them, not in the main column.
- **Check:** Find each fallback on the step. Fail if any is shown in full by default, or looks more important than the step's instruction.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Progressive Disclosure" (2006), <https://www.nngroup.com/articles/progressive-disclosure/>: initially show only the most important options and offer the rest on request.
- **Basis:** field — failed on 1 screen in 1 product and passed on the same step of a reference product (maintainer field note, 2026-11).
- **Pass:** "Check your inbox" with the address, and a small "Didn't get it?" link that reveals the resend button and the human check.
- **Fail:** A human-check widget sits in the middle of the confirmation screen and draws more attention than the sentence saying what to do.
- **Since:** 0.5.0

### NOISE-03 · Words fit the action

- **Rule:** The text a step shows before its primary action is no longer than the person needs to take that action.
- **Check:** Count the words in the main column (`words`, from `scripts/measure.mjs`) and the reading time at 238 words a minute. Read the text before the primary action and fail any sentence the person does not need to act; compare the count with the previous walk.
- **Measure:** `words`, `reading_time_s`
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Jakob Nielsen, "How Little Do Users Read?" (2008), <https://www.nngroup.com/articles/how-little-do-users-read/>: on an average page, people have time to read at most 28% of the words, and 20% is more likely.
- **Basis:** source — Steve Krug, *Don't Make Me Think, Revisited* (3rd ed., 2014), <https://sensible.com/dont-make-me-think/>: get rid of half the words on each page, then get rid of half of what is left.
- **Basis:** source — Marc Brysbaert, "How many words do we read per minute?" (2019), <https://doi.org/10.1016/j.jml.2019.104047>: the average silent reading rate for English non-fiction is about 238 words per minute.
- **Pass:** "Paste this line into your site's settings. It usually takes a minute to show up." above the value and a Copy button.
- **Fail:** Three paragraphs on why the setting matters, its history and its security model before the value the person must copy.
- **Since:** 0.5.0

### NOISE-04 · No welcome copy, tours or instructions to read first

- **Rule:** A task screen does not open with welcome copy, marketing claims, a tour or instructions that must be read or dismissed before acting.
- **Check:** Note what the person must read or dismiss before the primary action is usable. Fail any modal, carousel, tour step or paragraph of welcome or instructions in that position.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Steve Krug, *Don't Make Me Think, Revisited* (3rd ed., 2014), <https://sensible.com/dont-make-me-think/>: happy talk and up-front instructions are removed; people do not read them.
- **Basis:** source — Nielsen Norman Group, "Onboarding Tutorials vs. Contextual Help" (2023), <https://www.nngroup.com/articles/onboarding-tutorials/>: tutorials interrupt people, are often skipped and quickly forgotten.
- **Pass:** The first app screen shows the person's empty project list with one "Create your first project" button.
- **Fail:** The first app screen opens a five-slide tour that must be clicked through before the product is usable.
- **Since:** 0.5.0

### NOISE-05 · Nothing internal on screen

- **Rule:** No debug output, internal identifiers, placeholder text or raw data structures are visible to the person.
- **Check:** Read every visible string at both widths. Fail any debug line, environment name, internal code name, raw JSON, stack trace, placeholder ("Lorem ipsum", "TODO") or identifier the person did not create.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 2, match between the system and the real world, <https://www.nngroup.com/articles/ten-usability-heuristics/>: speak the person's language rather than internal, system-oriented terms.
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** A settings page shows "Weekly report: on" and the date of the last report.
- **Fail:** A settings page shows "Debug: no token" under the heading and an internal service name in the footer.
- **Since:** 0.5.0
