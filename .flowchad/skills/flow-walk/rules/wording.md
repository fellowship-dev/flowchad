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
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 2, match between the system and the real world, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "Use words, phrases, and concepts familiar to the user, rather than internal jargon."
- **Basis:** source — Page Laubheimer, "Menu-Design Checklist: 17 UX Guidelines" (Nielsen Norman Group, 2024), guideline 7, <https://www.nngroup.com/articles/menu-design/> (checked 2026-11-15): "use category labels that are familiar and relevant", not "made-up words, internal jargon, or abstract high-level categorization."
- **Pass:** A setting reads "Reminder email: sent to your client two days before the appointment".
- **Fail:** A setting reads "Notif. lead time (T-n)" with no hint of what is sent or to whom.
- **Since:** 0.5.0

### WORD-02 · Actions say what happens

- **Rule:** Every button and link names the action it performs or the place it goes, so it makes sense read on its own.
- **Check:** Read each button and link out of context. Fail "Click here", "Submit", "OK", "Learn more" or any label that does not say what happens next.
- **Severity:** should-fix
- **Applies to:** step, docs
- **Basis:** source — GOV.UK Service Manual, "Writing for user interfaces" (2017), <https://www.gov.uk/service-manual/design/writing-for-user-interfaces> (checked 2026-11-15): "make the purpose of the link clear from the link text alone."
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 2.4.4 Link Purpose (In Context) (2023), <https://www.w3.org/TR/WCAG22/#link-purpose-in-context> (checked 2026-11-15): "The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context".
- **Pass:** "Send invitation", "Download the invoice (PDF)".
- **Fail:** "Submit" on an invitation form, and "Click here" for the invoice.
- **Since:** 0.5.0

### WORD-03 · No scare wording

- **Rule:** A warning names a real, likely consequence and what to do about it, and routine actions carry no warning.
- **Check:** For each warning, caution or "insecure" label, write the consequence and how likely it is. Fail warnings with no concrete consequence, warnings on routine short-lived actions, and alarm words ("insecure", "danger", "critical") for normal states.
- **Severity:** should-fix
- **Applies to:** step, docs
- **Basis:** source — GOV.UK Design System, "Warning text", <https://design-system.service.gov.uk/components/warning-text/> (checked 2026-11-15): for the wording, "Use the warning text component when you need to warn users about something important, such as legal consequences of an action, or lack of action, that they might take."
- **Basis:** source — Jakob Nielsen, "Confirmation Dialogs Can Prevent User Errors (If Not Overused)" (Nielsen Norman Group, 2018), <https://www.nngroup.com/articles/confirmation-dialog/> (checked 2026-11-15): for how often to warn, not how to word it, "Do not use confirmation dialogs for routine actions", because "if you cry wolf too many times, people will stop paying attention to the question".
- **Pass:** "Anyone with this link can view these photos until Friday." on a share dialog.
- **Fail:** "Warning: insecure! Your files may be exposed." on every share dialog, including links limited to named people.
- **Since:** 0.5.0

### WORD-04 · One name for one thing

- **Rule:** The same thing has the same name, and the same name means the same thing, on every screen, email, document and companion product the flow touches.
- **Check:** List the names the walk sees for each key object, state and level (screens, emails, docs, a marketing site and the app). Fail any object with two names or any name used for two things.
- **Severity:** should-fix
- **Applies to:** step, flow, docs
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 4, consistency and standards, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "Users should not have to wonder whether different words, situations, or actions mean the same thing."
- **Basis:** field — failed in 1 flow in 2 products of one maker (maintainer field note, 2026-11; FN-0016).
- **Pass:** The pricing page, the app and the welcome email all call the shared space a "Team folder".
- **Fail:** The pricing page calls it a "Team folder", the app calls the same thing a "Workspace" and the welcome email calls it a "Shared drive".
- **Since:** 0.5.0

### WORD-05 · What the screen says is true

- **Rule:** Every fact a screen states about the person's own thing is true when checked against an independent source.
- **Check:** For each claim (a record is valid, a check passed, "sent", a total, advice to apply), check it independently as in `references/walk-checks.md` and record it in `truth_checks`. Fail any claim that disagrees.
- **Severity:** blocker
- **Applies to:** step, docs
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 1, visibility of system status, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "keep users informed about what is going on, through appropriate feedback within a reasonable amount of time."
- **Basis:** field — failed in 4 flows in 2 products (maintainer field note, 2026-11; FN-0017, FN-0018, FN-0019, FN-0020).
- **Pass:** "Sent at 14:02 to the address you gave", and the captured mail arrived at 14:02.
- **Fail:** An invoicing app marks an invoice "Paid" while the payment provider shows the payment as refunded.
- **Since:** 0.5.0
