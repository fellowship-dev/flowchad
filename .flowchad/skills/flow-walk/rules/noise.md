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
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 8, aesthetic and minimalist design, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility."
- **Basis:** field — failed on 2 screens in 1 product (maintainer field note, 2026-11; FN-2026-11-12).
- **Pass:** An email confirmation screen shows the address the email went to, what to do next and one quiet "Not seeing it?" link.
- **Fail:** An email confirmation screen shows a plan badge, a "Profile 40% complete" meter, a feedback widget and a promotion banner around the instruction.
- **Since:** 0.5.0

### NOISE-02 · Fallbacks hide behind one link

- **Rule:** Fallback paths such as resending, trying another way, a human check or contacting support sit behind one quiet link on the screen that needs them, not in the main column.
- **Check:** Find each fallback on the step. Fail if any is shown in full by default, or looks more important than the step's instruction.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Progressive Disclosure" (2006), <https://www.nngroup.com/articles/progressive-disclosure/> (checked 2026-11-15): "Initially, show users only a few of the most important options. Offer a larger set of specialized options upon request."
- **Basis:** field — failed on 1 screen in 1 product and passed on the same step of a reference product (maintainer field note, 2026-11; FN-2026-11-13).
- **Pass:** "Check your inbox" with the address, and a small "Didn't get it?" link that reveals the resend button and the human check.
- **Fail:** A human-check widget sits in the middle of the confirmation screen and draws more attention than the sentence saying what to do.
- **Since:** 0.5.0

### NOISE-03 · Words fit the action

- **Rule:** The text a step shows before its primary action is no longer than the person needs to take that action.
- **Check:** Count the words in the main column (`words`, from `scripts/measure.mjs`) and the reading time at 238 words a minute. Read the text before the primary action and fail any sentence the person does not need to act; compare the count with the previous walk.
- **Measure:** `words`, `reading_time_s`
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Jakob Nielsen, "How Little Do Users Read?" (2008), <https://www.nngroup.com/articles/how-little-do-users-read/> (checked 2026-11-15): "users have time to read at most 28% of the words during an average visit; 20% is more likely."
- **Basis:** source — Marc Brysbaert, "How many words do we read per minute? A review and meta-analysis of reading rate" (Journal of Memory and Language, 2019), <https://doi.org/10.1016/j.jml.2019.104047> (checked 2026-11-15 against the author's preprint abstract): "the average silent reading rate for adults in English is 238 words per minute (wpm) for non-fiction".
- **Threshold source:** <https://doi.org/10.1016/j.jml.2019.104047> (checked 2026-11-15): 238 words per minute for non-fiction.
- **Pass:** "Share this link with your guests. Anyone with it can view the album." above the link and a Copy button.
- **Fail:** Three paragraphs on how sharing works, its history and its security model before the link the person must copy.
- **Since:** 0.5.0

### NOISE-04 · No welcome copy, tours or instructions to read first

- **Rule:** A task screen does not open with welcome copy, marketing claims, a tour or instructions that must be read or dismissed before acting.
- **Check:** Note what the person must read or dismiss before the primary action is usable. Fail any modal, carousel, tour step or paragraph of welcome or instructions in that position.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Onboarding Tutorials vs. Contextual Help" (2023), <https://www.nngroup.com/articles/onboarding-tutorials/> (checked 2026-11-15): "Tutorials interrupt users, don't necessarily improve task performance, and are quickly forgotten."
- **Pass:** The first app screen shows the person's empty project list with one "Create your first project" button.
- **Fail:** The first app screen opens a five-slide tour that must be clicked through before the product is usable.
- **Since:** 0.5.0

### NOISE-05 · Nothing internal on screen

- **Rule:** No debug output, internal identifiers, placeholder text or raw data structures are visible to the person.
- **Check:** Read every visible string at both widths. Fail any debug line, environment name, internal code name, raw JSON, stack trace, placeholder ("Lorem ipsum", "TODO") or identifier the person did not create.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 2, match between the system and the real world, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "Use words, phrases, and concepts familiar to the user, rather than internal jargon."
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-14, FN-2026-11-15).
- **Pass:** An invoice page shows "Due 30 June" and the client's name.
- **Fail:** An invoice page shows "undefined" where the due date should be and a temporary record code under the total.
- **Since:** 0.5.0
