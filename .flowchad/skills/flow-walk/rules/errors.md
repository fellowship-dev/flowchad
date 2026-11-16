<!-- prefix: ERR -->
# Errors and dead ends

A dead end is a screen with no way forward toward the value moment. An error
is judged by whether a person can recover from it alone, using only what the
screen tells them. The dead-end pass in `references/walk-checks.md` is where
most of these are found.

### ERR-01 · No dead ends on the path

- **Rule:** Every screen on the path to the value moment has a way forward, and none ends without an action that moves toward value.
- **Check:** Mark `dead_end: true` or `false` on every step: true when its screen has no action toward value (an empty embed, a page with only "Back", an error with no next step). Fail the flow if any step on the happy path is a dead end.
- **Measure:** `dead_ends`
- **Threshold:** `dead_ends = 0`
- **Severity:** blocker
- **Applies to:** step, flow, map
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 3, user control and freedom, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): people need "a clearly marked 'emergency exit' to leave the unwanted action without having to go through an extended process."
- **Basis:** field — failed in 3 flows in 2 products (maintainer field note, 2026-11; FN-2026-11-25, FN-2026-11-26, FN-2026-11-27).
- **Threshold source:** <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): a way out of every unwanted state; zero dead ends follows from the rule itself and is FlowChad's own standard, not a number from the source.
- **Pass:** A booking embed with no free times says so and offers "Email us instead" and the next date with times.
- **Fail:** Every "Book a call" link opens a booking page that shows no available times and no other way to reach anyone.
- **Since:** 0.5.0

### ERR-02 · Errors say what happened and how to fix it

- **Rule:** Every error message says what went wrong and how to fix it, in plain words, next to the place it happened.
- **Check:** Trigger the errors the dead-end pass allows (empty input, wrong format, wrong password, a limit). Quote each message. Fail any that lacks the cause, lacks the fix, uses blame or "Oops", or appears away from the field or action.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — GOV.UK Design System, "Error message", <https://design-system.service.gov.uk/components/error-message/> (checked 2026-11-15): "explain what went wrong and how to fix it", in plain English; do not use "oops" or "sorry".
- **Basis:** source — Nielsen Norman Group, "Error-Message Guidelines" (2023), <https://www.nngroup.com/articles/error-message-guidelines/> (checked 2026-11-15): "Display the error message close to the error's source", use human-readable language and offer constructive advice.
- **Pass:** Under the date field: "Enter a date in the future, like 27 3 2027".
- **Fail:** A red banner at the top of the page: "Oops! Invalid input."
- **Since:** 0.5.0

### ERR-03 · Errors keep what was typed

- **Rule:** After an error, everything the person typed or chose is still there, except values that must be re-entered for security.
- **Check:** Fill the step completely, trigger an error, and compare the fields with what was entered. Fail if any non-secret field was cleared.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — Nielsen Norman Group, "Error-Message Guidelines" (2023), <https://www.nngroup.com/articles/error-message-guidelines/> (checked 2026-11-15): "Preserve the user's input. Let users correct errors by editing their original action instead of starting over."
- **Pass:** A wrong card number is highlighted; name, address and email stay filled in.
- **Fail:** A wrong card number clears the whole form, including the name and address.
- **Since:** 0.5.0

### ERR-04 · No raw errors

- **Rule:** No status code, stack trace, raw response or internal error identifier is shown as the only explanation of a failure.
- **Check:** Quote every failure message the walk sees, including in popups, embeds and consent screens. Fail any that is only a code, a raw response or an internal message.
- **Severity:** should-fix
- **Applies to:** step, agent
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 9, help users recognize, diagnose and recover from errors, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution."
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-28, FN-2026-11-29).
- **Pass:** "We couldn't connect your account because the approval window closed. Try again" with a button.
- **Fail:** Pressing "Allow access" shows a raw JSON object with an error code and nothing else.
- **Since:** 0.5.0
