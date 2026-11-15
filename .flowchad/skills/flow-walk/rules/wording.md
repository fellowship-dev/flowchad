<!-- prefix: WORD -->
# Wording

Words are judged as the person reads them: exact text, quoted in the report.
The test is whether someone new to the product knows what a word means, what
a button will do, and whether what the screen says is true.

### WORD-01 · The person's words

- **Rule:** Labels, headings and buttons use the words the person would use for the task, and a term they would not know comes with a short line saying what it does for them.
- **Check:** Read each label, heading and menu item as someone new to the product. Fail any internal, team or technical term shown without a one-line explanation of who uses it and why.
- **Severity:** should-fix
- **Applies to:** step, docs
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 2, match between the system and the real world, <https://www.nngroup.com/articles/ten-usability-heuristics/>: use words, phrases and concepts familiar to the person.
- **Basis:** source — Louis Rosenfeld, Peter Morville and Jorge Arango, *Information Architecture* (4th ed., 2015), <https://www.oreilly.com/library/view/information-architecture-4th/9781491913529/>: labels use the vocabulary of the people the site serves.
- **Pass:** A setting reads "Weekly summary email: a short report every Monday for whoever manages the site".
- **Fail:** A setting reads "Digest cadence (product)" with no hint of what the product is or who receives it.
- **Since:** 0.5.0

### WORD-02 · Actions say what happens

- **Rule:** Every button and link names the action it performs or the place it goes, so it makes sense read on its own.
- **Check:** Read each button and link out of context. Fail "Click here", "Submit", "OK", "Learn more" or any label that does not say what happens next.
- **Severity:** should-fix
- **Applies to:** step, docs
- **Basis:** source — GOV.UK Service Manual, "Writing for user interfaces" (2017), <https://www.gov.uk/service-manual/design/writing-for-user-interfaces>: make the purpose of a link clear from the link text alone.
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 2.4.4 Link Purpose (In Context) (2023), <https://www.w3.org/TR/WCAG22/#link-purpose-in-context>: the purpose of each link can be determined from its text and context.
- **Pass:** "Send invitation", "Download the invoice (PDF)".
- **Fail:** "Submit" on an invitation form, and "Click here" for the invoice.
- **Since:** 0.5.0

### WORD-03 · No scare wording

- **Rule:** A warning names a real, likely consequence and what to do about it, and routine actions carry no warning.
- **Check:** For each warning, caution or "insecure" label, write the consequence and how likely it is. Fail warnings with no concrete consequence, warnings on routine short-lived actions, and alarm words ("insecure", "danger", "critical") for normal states.
- **Severity:** should-fix
- **Applies to:** step, docs
- **Basis:** source — Nielsen Norman Group, "Confirmation Dialogs Can Prevent User Errors" (2018), <https://www.nngroup.com/articles/confirmation-dialog/>: warnings on routine actions teach people to ignore all warnings.
- **Basis:** source — GOV.UK Design System, "Error message", <https://design-system.service.gov.uk/components/error-message/>: describe what happened and how to fix it in plain, positive language.
- **Pass:** "This link signs you in. It works once, for the next 5 minutes."
- **Fail:** "Warning: insecure link. Anyone with this link may access your account." on a single-use sign-in link that expires in minutes.
- **Since:** 0.5.0

### WORD-04 · One name for one thing

- **Rule:** The same thing has the same name, and the same name means the same thing, on every screen, email, document and companion product the flow touches.
- **Check:** List the names the walk sees for each key object, state and level (screens, emails, docs, a marketing site and the app). Fail any object with two names or any name used for two things.
- **Severity:** should-fix
- **Applies to:** step, flow, docs
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 4, consistency and standards, <https://www.nngroup.com/articles/ten-usability-heuristics/>: people should not have to wonder whether different words mean the same thing.
- **Basis:** field — failed in 1 flow in 2 products of one maker (maintainer field note, 2026-11).
- **Pass:** The marketing site, the app and the welcome email all call the three states "Not set up", "Partly protected" and "Protected".
- **Fail:** The marketing site calls a state "Partly protected" while the app calls the same state "Basic" and gives the same site a different verdict.
- **Since:** 0.5.0

### WORD-05 · What the screen says is true

- **Rule:** Every fact a screen states about the person's own thing is true when checked against an independent source.
- **Check:** For each claim (a record is valid, a check passed, "sent", a total, advice to apply), check it independently as in `references/walk-checks.md` and record it in `truth_checks`. Fail any claim that disagrees.
- **Severity:** blocker
- **Applies to:** step, docs
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 1, visibility of system status, <https://www.nngroup.com/articles/ten-usability-heuristics/>: keep people informed about what is going on through appropriate, timely feedback.
- **Basis:** field — failed in 4 flows in 2 products (maintainer field note, 2026-11).
- **Pass:** "Sent at 14:02 to the address you gave", and the captured mail arrived at 14:02.
- **Fail:** A checker suggests a configuration change that, applied as shown, would break the person's existing setup.
- **Since:** 0.5.0
