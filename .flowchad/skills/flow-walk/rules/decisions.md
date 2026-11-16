<!-- prefix: DEC -->
# Decisions and inputs

Every question asked of the person costs attention, and every field costs
typing. The product decides what it can, asks once, and adds friction only
when it can name the harm the friction prevents.

A **decision** is a question the person must answer: a choice, or a field
they must fill. A group of answers that belong together (the parts of a date,
an address) is one decision.

### DEC-01 · One decision per screen in setup and transactions

- **Rule:** A setup or transaction screen asks for one decision or one group of closely related answers.
- **Check:** Count the decisions on each screen of the flow (`decisions`). Fail a screen with more than one; a screen that experts repeat daily may be overridden with a reason in the flow file.
- **Measure:** `decisions`
- **Threshold:** `decisions <= 1`
- **Severity:** should-fix
- **Applies to:** step, map
- **Basis:** source — GOV.UK Service Manual, "Structuring forms" (2016), <https://www.gov.uk/service-manual/design/form-structure> (checked 2026-11-15): "Start with one thing per page": one question, one decision or one piece of information.
- **Basis:** source — GOV.UK Design System, "Question pages", <https://design-system.service.gov.uk/patterns/question-pages/> (checked 2026-11-15): "Start by asking one question per page"; a question page has a back link, a heading and a Continue button.
- **Threshold source:** <https://www.gov.uk/service-manual/design/form-structure> (checked 2026-11-15): one thing per page sets the limit of one decision per screen.
- **Pass:** A booking tool's setup asks "What is the service you offer called?" on one screen and "How long does an appointment last?" on the next.
- **Fail:** A booking tool's setup asks for the service name, the price, the length, the time zone and a team name on one screen.
- **Since:** 0.5.0

### DEC-02 · Ask once

- **Rule:** The flow never asks for something the person already gave in this journey or that the product already holds.
- **Check:** Keep a list of every value typed or chosen during the walk, and of facts the product showed it knows. Fail any later field or choice that asks for one of them again, including after an email link or a redirect.
- **Measure:** `fields_to_value`
- **Severity:** blocker
- **Applies to:** step, flow, map
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 3.3.7 Redundant Entry (2023), <https://www.w3.org/TR/WCAG22/#redundant-entry> (checked 2026-11-15): information previously entered that is required again in the same process is auto-populated or available to select.
- **Basis:** field — failed in 3 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-07, FN-2026-11-08, FN-2026-11-09).
- **Pass:** The email address typed on the landing page is already filled in on the sign-up screen.
- **Fail:** The password chosen at sign-up is asked for again, twice, under "Set a new password" after the email link.
- **Since:** 0.5.0

### DEC-03 · Derive instead of asking

- **Rule:** The product does not ask the person to choose or type what it can find out itself, and a choice list appears only when a real constraint forces a choice.
- **Check:** For each field and choice, ask whether the product could derive it (from earlier answers, a connected account, the address, the browser) or default it safely. Fail any it could; name the constraint for each list that remains.
- **Measure:** `decisions`, `fields_to_value`
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** source — Nielsen Norman Group, "Website Forms Usability: Top 10 Recommendations" (2016), <https://www.nngroup.com/articles/web-form-design/> (checked 2026-11-15): "Remove fields which collect information that can be (a) derived in some other way, (b) collected more conveniently at a later date, or (c) simply omitted."
- **Basis:** source — GOV.UK Service Manual, "Designing good questions", <https://www.gov.uk/service-manual/design/designing-good-questions> (checked 2026-11-15): "make sure you know why you're asking every question."
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-10, FN-2026-11-11).
- **Pass:** After the person connects their calendar, the booking tool reads their working hours from it, and asks only if the calendar has none.
- **Fail:** After the person connects their calendar, they must type their working hours again, day by day, although the calendar holds them.
- **Since:** 0.5.0

### DEC-04 · Friction needs a named threat

- **Rule:** Expiry, limits, confirmations, extra verification and bot checks appear on the path only where the flow file names the abuse or mistake they prevent.
- **Check:** List every confirmation, expiry, code, proof step and bot check on the path. Fail each one with no `reason` in the flow file's `friction` list.
- **Severity:** should-fix
- **Applies to:** step, flow
- **Basis:** source — Jakob Nielsen, "Confirmation Dialogs Can Prevent User Errors (If Not Overused)" (Nielsen Norman Group, 2018), <https://www.nngroup.com/articles/confirmation-dialog/> (checked 2026-11-15): "Do not use confirmation dialogs for routine actions"; if you cry wolf too many times, people stop paying attention.
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 2.2.1 Timing Adjustable (2023), <https://www.w3.org/TR/WCAG22/#timing-adjustable> (checked 2026-11-15): the person can turn off, adjust or extend a time limit.
- **Pass:** Deleting a project asks once and names what is lost; the flow file says why ("deletion cannot be undone").
- **Fail:** Saving a profile asks "Are you sure?", and a file-sharing link expires after ten minutes with no reason recorded anywhere.
- **Since:** 0.5.0

### DEC-05 · Codes paste, sign-in needs no puzzle

- **Rule:** A one-time code is one input that accepts paste, and signing in never requires a puzzle or transcription, and accepts paste or a password manager for anything recalled.
- **Check:** Paste a code into every code input on the path, and fill every password field from a password manager. Fail split boxes that reject paste, password fields that block paste or autofill, and sign-in steps that need transcription or a puzzle without another way through.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 3.3.8 Accessible Authentication (Minimum) (2023), <https://www.w3.org/TR/WCAG22/#accessible-authentication-minimum> (checked 2026-11-15): no cognitive function test (such as remembering a password or solving a puzzle) unless an alternative or a mechanism to assist exists; its notes name password managers and copy and paste.
- **Pass:** A six-digit code goes into one field, pasting it fills it, and the password field accepts the password manager's fill.
- **Fail:** A six-digit code is split into six boxes that accept one typed character each and ignore paste.
- **Since:** 0.5.0
