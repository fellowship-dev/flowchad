<!-- prefix: PATH -->
# Path to value

The value moment is the first thing the person came for: their own result,
a working install, a confirmed booking, a first sent invoice. A flow is judged
by the path to it. Map it before building, then shorten it from the value
moment backwards.

### PATH-01 · Name the value moment, and reach it

- **Rule:** The flow declares its value moment in one sentence, and the walk reaches it without help.
- **Check:** Read `value_moment` in the flow file; during the walk mark the step where the person first sees it (`first_value: true`). Fail if the flow has no value moment, or the walk ends without reaching it.
- **Measure:** `time_to_value_ms`, `screens_to_value`
- **Severity:** blocker
- **Applies to:** flow, map
- **Basis:** source — Jeff Sauro, "10 Things To Know About Completion Rates" (MeasuringU, 2011), <https://measuringu.com/completion-rates/> (checked 2026-11-15): "Completion rates are the fundamental usability metric"; if people cannot complete the task, not much else matters.
- **Pass:** A booking tool's sign-up flow declares "the calendar shows the person's first bookable slot", and the walk ends on that screen.
- **Fail:** A sign-up flow ends on "Your account has been created" with nothing of the person's own on screen, and the flow file names no value moment.
- **Since:** 0.5.0

### PATH-02 · Start with the step that unblocks value

- **Rule:** The first screen after entry asks for the thing the value moment depends on, not a report, score or warning about steps the person has not taken yet.
- **Check:** On the first task screen, name the step that unblocks the value moment and compare it with what the screen leads with. Fail if a status report, empty score or "not set up yet" warning comes before that step.
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** source — Nielsen Norman Group, "Onboarding Tutorials vs. Contextual Help" (2023), <https://www.nngroup.com/articles/onboarding-tutorials/> (checked 2026-11-15): "Users want to start using the product right away"; up-front material interrupts people who are trying to do something else.
- **Pass:** An invoicing app opens on "Add your first client" with one input; the revenue summary appears once the first invoice is sent.
- **Fail:** An invoicing app opens with an empty "Revenue this month" chart and an "Overdue" report above the input that adds the first client.
- **Since:** 0.5.0

### PATH-03 · Every step earns its place

- **Rule:** Each step before the value moment either collects something the value needs or delivers part of it, and any other step is removed, merged or moved after the value moment.
- **Check:** For each step before the value moment, write one line on what it contributes to the value. Fail a step with no line, such as a survey, a tour or a preference that has a safe default.
- **Measure:** `screens_to_value`
- **Severity:** should-fix
- **Applies to:** flow, map
- **Basis:** source — GOV.UK Service Manual, "Designing good questions", <https://www.gov.uk/service-manual/design/designing-good-questions> (checked 2026-11-15): "Before you start, make sure you know why you're asking every question."
- **Pass:** A trial sign-up asks for email and password, then shows the product; "How did you hear about us?" is asked a week later.
- **Fail:** A trial sign-up asks for company size, role and a theme colour before the person can see anything of their own.
- **Since:** 0.5.0

### PATH-04 · A result leads forward

- **Rule:** A screen that shows the person a result offers the next step toward the value moment as its primary action.
- **Check:** On every result screen (a quote, a preview, an estimate, a score), look at the visually dominant action. Fail if it leads sideways (another tool, more detail, a newsletter) while the step toward value is missing or secondary.
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-01, FN-2026-11-02).
- **Pass:** A moving company's quote calculator ends with the price and one button, "Book this move".
- **Fail:** The quote calculator ends with "See the detailed breakdown" and links to three other calculators, and no way to book.
- **Since:** 0.5.0

### PATH-05 · Fixed sequences only for first-time or rare setup

- **Rule:** A fixed step-by-step sequence is used for first-time or infrequent setup, and tasks people repeat are not forced through one.
- **Check:** For each multi-step sequence, ask how often a person does it. Fail a sequence that a returning person must click through again to change one thing.
- **Severity:** later
- **Applies to:** flow, map
- **Basis:** source — Nielsen Norman Group, "Wizards: Definition and Design Recommendations" (2017), <https://www.nngroup.com/articles/wizards/> (checked 2026-11-15): "Use wizards for novice users or infrequent processes (e.g., configuration or setup)."
- **Pass:** First setup is a three-step sequence; later, each setting can be changed on its own page.
- **Fail:** Changing the notification email reopens the five-step setup wizard at step one.
- **Since:** 0.5.0

### PATH-06 · No loops on the happy path

- **Rule:** The happy path never returns the person to a screen or question they already completed, unless they chose to go back.
- **Check:** Record each step's `screen`; mark `revisit: true` when a screen or question already completed in this walk appears again without the person asking for it. Fail if any step on the path to value is a revisit.
- **Measure:** `loops`
- **Severity:** should-fix
- **Applies to:** flow, map
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-03, FN-2026-11-04).
- **Pass:** After confirming their email, the person continues at the step they left.
- **Fail:** After confirming their email, the person is sent back to the plan screen they already completed.
- **Since:** 0.5.0
