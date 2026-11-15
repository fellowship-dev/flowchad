<!-- prefix: WAIT -->
# Waiting and empty states

Waits are measured, not felt: each one is recorded with its duration and
whether the screen said anything while it lasted. Empty states are the first
screen most new accounts see; they must say what goes there and how to fill
it.

### WAIT-01 · Show status for waits of 2 seconds or more

- **Rule:** Any wait of 2 seconds or more shows that the product is working, from the moment it starts.
- **Check:** Time each wait after an action (`wait_ms`) and note whether a spinner, skeleton or status text appeared within the first second (`wait_feedback`). Fail a wait of 2 seconds or more with no feedback.
- **Measure:** `wait_ms`, `wait_feedback`
- **Threshold:** `wait_feedback = true when wait_ms >= 2000`
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Progress Indicators Make a Slow System Less Insufferable" (2014), <https://www.nngroup.com/articles/progress-indicators/>: a looped indicator for actions of 2 to 10 seconds; under 1 second an indicator distracts.
- **Basis:** source — Jakob Nielsen, "Response Time Limits" (1993), <https://www.nngroup.com/articles/response-times-3-important-limits/>: about 1 second keeps the flow of thought; beyond that, people notice the delay.
- **Pass:** Pressing "Check now" shows "Checking…" at once and the result 4 seconds later.
- **Fail:** Pressing "Check now" leaves the page unchanged for 6 seconds, then the result appears.
- **Since:** 0.5.0

### WAIT-02 · Show progress and an estimate for waits over 10 seconds

- **Rule:** A wait longer than 10 seconds shows progress and how long it will take, or what happens next if the person leaves.
- **Check:** For each wait over 10 seconds, note whether the screen shows progress (percent, steps done, or an estimate) or says the work continues if the person leaves (`wait_progress`). Fail if it shows only a spinner.
- **Measure:** `wait_ms`, `wait_progress`
- **Threshold:** `wait_progress = true when wait_ms > 10000`
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Progress Indicators Make a Slow System Less Insufferable" (2014), <https://www.nngroup.com/articles/progress-indicators/>: for actions over 10 seconds use a percent-done indicator; looped animation alone makes people impatient.
- **Basis:** source — Jakob Nielsen, "Response Time Limits" (1993), <https://www.nngroup.com/articles/response-times-3-important-limits/>: over 10 seconds, show an estimate of when the work will be done.
- **Pass:** "Importing 40 of 120 items · about 1 minute left · you can close this page".
- **Fail:** A spinner with no text for 45 seconds while an import runs.
- **Since:** 0.5.0

### WAIT-03 · Outside waits are explained

- **Rule:** When the next step depends on something outside the product (an email, another service, a change that takes time to spread), the screen says what is happening, how long it usually takes and what to do if it does not arrive.
- **Check:** For each step that waits on something outside the product, read the screen for the three parts: what, usual time, what to do otherwise. Fail if any is missing.
- **Severity:** should-fix
- **Applies to:** step, docs
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 1, visibility of system status, <https://www.nngroup.com/articles/ten-usability-heuristics/>: keep people informed about what is going on within a reasonable time.
- **Basis:** source — Nielsen Norman Group, "Progress Indicators Make a Slow System Less Insufferable" (2014), <https://www.nngroup.com/articles/progress-indicators/>: tell people how long they will wait.
- **Pass:** "We sent a link to the address you gave. It usually arrives within a minute. Not there? Check spam or send it again."
- **Fail:** "Still waiting" after pressing Check, with no idea of how long to wait or what else to try.
- **Since:** 0.5.0

### WAIT-04 · Empty states teach the next action

- **Rule:** An empty list, dashboard or report says what will appear there and offers the action that fills it.
- **Check:** Walk a brand-new account (or a local copy with no data) to every list and dashboard on the path. Fail an empty state that shows only "No data", a blank area, or a next step that does not apply to this account.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Designing Empty States in Complex Applications: 3 Guidelines" (2021), <https://www.nngroup.com/articles/empty-state-interface-design/>: empty states communicate system status, help people learn the system and give direct pathways to start.
- **Basis:** source — Samuel Hulick, useronboard.com, <https://www.useronboard.com/user-onboarding-teardowns/>: empty states are where a first-run product teaches its next action.
- **Pass:** "No reports yet. Your first weekly report arrives on Monday. Add another site" with an "Add site" button.
- **Fail:** An empty dashboard that says "No data" and links to a setup guide for a different edition of the product.
- **Since:** 0.5.0
