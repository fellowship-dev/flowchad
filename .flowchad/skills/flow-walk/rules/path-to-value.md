<!-- prefix: PATH -->
# Path to value

The value moment is the first thing the person came for: their own result,
a working install, a verified setting, a first report. A flow is judged by the
path to it. Map it before building, then shorten it from the value moment
backwards.

### PATH-01 · Name the value moment, and reach it

- **Rule:** The flow declares its value moment in one sentence, and the walk reaches it without help.
- **Check:** Read `value_moment` in the flow file; during the walk mark the step where the person first sees it (`first_value: true`). Fail if the flow has no value moment, or the walk ends without reaching it.
- **Measure:** `time_to_value_ms`, `screens_to_value`
- **Severity:** blocker
- **Applies to:** flow, map
- **Basis:** source — Samuel Hulick, *User Onboarding* teardowns (useronboard.com), <https://www.useronboard.com/>: onboarding succeeds when the person succeeds at what they came to do, not when a tour or sign-up completes.
- **Basis:** source — Jeff Sauro and James R. Lewis, *Quantifying the User Experience* (2nd ed., 2016), MeasuringU, <https://measuringu.com/>: task completion is the first measure to report for a core task.
- **Pass:** A sign-up flow declares "the dashboard shows the first check of the person's own site", and the walk ends on that screen.
- **Fail:** A sign-up flow ends on "Your account has been created" with nothing of the person's own on screen, and the flow file names no value moment.
- **Since:** 0.5.0

### PATH-02 · Start with the step that unblocks value

- **Rule:** The first screen after entry asks for the thing the value moment depends on, not a report, score or warning about steps the person has not taken yet.
- **Check:** On the first task screen, name the step that unblocks the value moment and compare it with what the screen leads with. Fail if a status report, empty score or "not set up yet" warning comes before that step.
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** source — Samuel Hulick, useronboard.com, <https://www.useronboard.com/user-onboarding-teardowns/>: each first-run step should move the person toward their first successful outcome.
- **Basis:** source — Nielsen Norman Group, "Onboarding Tutorials vs. Contextual Help" (2023), <https://www.nngroup.com/articles/onboarding-tutorials/>: up-front material interrupts people who want to start the task.
- **Pass:** A setup wizard opens on "Connect your site" with one input; the health report appears after the site is connected.
- **Fail:** A setup wizard opens with a red "0 of 5 checks passing" report above the input that would make the checks pass.
- **Since:** 0.5.0

### PATH-03 · Every step earns its place

- **Rule:** Each step before the value moment either collects something the value needs or delivers part of it, and any other step is removed, merged or moved after the value moment.
- **Check:** For each step before the value moment, write one line on what it contributes to the value. Fail a step with no line, such as a survey, a tour or a preference that has a safe default.
- **Measure:** `screens_to_value`
- **Severity:** should-fix
- **Applies to:** flow, map
- **Basis:** source — GOV.UK Service Manual, "Designing good questions", <https://www.gov.uk/service-manual/design/designing-good-questions>: know why you are asking every question before you ask it.
- **Basis:** source — Samuel Hulick, useronboard.com, <https://www.useronboard.com/user-onboarding-teardowns/>: steps that do not move toward the first success are cut or deferred.
- **Pass:** A trial sign-up asks for email and password, then shows the product; "How did you hear about us?" is asked a week later.
- **Fail:** A trial sign-up asks for company size, role and a theme colour before the person can see anything of their own.
- **Since:** 0.5.0

### PATH-04 · A result leads forward

- **Rule:** A screen that shows the person a result offers the next step toward the value moment as its primary action.
- **Check:** On every result screen (a check, a quote, a preview, a score), look at the visually dominant action. Fail if it leads sideways (another tool, more detail, a newsletter) while the step toward value is missing or secondary.
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** source — Samuel Hulick, useronboard.com, <https://www.useronboard.com/user-onboarding-teardowns/>: after an early win, the product points straight at the next step to the outcome.
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** A free website check ends with the problems found and one button, "Fix these in a free account".
- **Fail:** A free website check ends with "See the detailed report" and three links to other free checkers, and no way to act on the result.
- **Since:** 0.5.0

### PATH-05 · Fixed sequences only for first-time or rare setup

- **Rule:** A fixed step-by-step sequence is used for first-time or infrequent setup, and tasks people repeat are not forced through one.
- **Check:** For each multi-step sequence, ask how often a person does it. Fail a sequence that a returning person must click through again to change one thing.
- **Severity:** later
- **Applies to:** flow, map
- **Basis:** source — Nielsen Norman Group, "Wizards: Definition and Design Recommendations" (2017), <https://www.nngroup.com/articles/wizards/>: use wizards for novice users or infrequent processes such as configuration or setup.
- **Pass:** First setup is a three-step sequence; later, each setting can be changed on its own page.
- **Fail:** Changing the notification email reopens the five-step setup wizard at step one.
- **Since:** 0.5.0

### PATH-06 · No loops on the happy path

- **Rule:** The happy path never returns the person to a screen or question they already completed, unless they chose to go back.
- **Check:** Record each step's `screen`; mark `revisit: true` when a screen or question already completed in this walk appears again without the person asking for it. Fail if any step on the path to value is a revisit.
- **Measure:** `loops`
- **Severity:** should-fix
- **Applies to:** flow, map
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** After confirming their email, the person continues at the step they left.
- **Fail:** After confirming their email, the person is asked to set the password they already set during sign-up.
- **Since:** 0.5.0
