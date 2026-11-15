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
- **Basis:** source — GOV.UK Service Manual, "Structuring forms" (2016), <https://www.gov.uk/service-manual/design/form-structure>: start with one thing per page, one question, decision or piece of information.
- **Basis:** source — GOV.UK Design System, "Question pages", <https://design-system.service.gov.uk/patterns/question-pages/>: each question page has one heading, the question, and one Continue button.
- **Pass:** A setup wizard asks "Which site do you want to check?" on one screen and "Who should get the weekly report?" on the next.
- **Fail:** A setup wizard asks for the site, the plan, the reporting email, the time zone and a team name on one screen.
- **Since:** 0.5.0

### DEC-02 · Ask once

- **Rule:** The flow never asks for something the person already gave in this journey or that the product already holds.
- **Check:** Keep a list of every value typed or chosen during the walk, and of facts the product showed it knows. Fail any later field or choice that asks for one of them again, including after an email link or a redirect.
- **Measure:** `fields_to_value`
- **Severity:** blocker
- **Applies to:** step, flow, map
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 3.3.7 Redundant Entry (2023), <https://www.w3.org/TR/WCAG22/#redundant-entry>: information already entered in the same process is filled in or available to select.
- **Basis:** field — failed in 3 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** The site address typed on the landing page is already filled in on the sign-up screen.
- **Fail:** The password chosen at sign-up is asked for again, twice, under "Set a new password" after the email link.
- **Since:** 0.5.0

### DEC-03 · Derive instead of asking

- **Rule:** The product does not ask the person to choose or type what it can find out itself, and a choice list appears only when a real constraint forces a choice.
- **Check:** For each field and choice, ask whether the product could derive it (from earlier answers, a connected account, the address, the browser) or default it safely. Fail any it could; name the constraint for each list that remains.
- **Measure:** `decisions`, `fields_to_value`
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** source — Nielsen Norman Group, "Website Forms Usability: Top 10 Recommendations" (2016), <https://www.nngroup.com/articles/web-form-design/>: remove fields that are not needed, and every field must justify itself.
- **Basis:** source — GOV.UK Service Manual, "Designing good questions", <https://www.gov.uk/service-manual/design/designing-good-questions>: know why you are asking every question.
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** After the person connects their account, every site in it is added; a picker appears only when the plan allows fewer sites than the account holds.
- **Fail:** After the person connects their account, they must tick each site from a list to add it, although the plan allows all of them.
- **Since:** 0.5.0

### DEC-04 · Friction needs a named threat

- **Rule:** Expiry, limits, confirmations, extra verification and bot checks appear on the path only where the flow file names the abuse or mistake they prevent.
- **Check:** List every confirmation, expiry, code, proof step and bot check on the path. Fail each one with no `reason` in the flow file's `friction` list.
- **Severity:** should-fix
- **Applies to:** step, flow
- **Basis:** source — Nielsen Norman Group, "Confirmation Dialogs Can Prevent User Errors" (2018), <https://www.nngroup.com/articles/confirmation-dialog/>: do not use confirmation dialogs for routine actions; people learn to click through them.
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 2.2.1 Timing Adjustable (2023), <https://www.w3.org/TR/WCAG22/#timing-adjustable>: time limits can be turned off, adjusted or extended.
- **Pass:** Deleting a project asks once and names what is lost; the flow file says why ("deletion cannot be undone").
- **Fail:** Saving a profile asks "Are you sure?", and a sharing link expires after ten minutes with no reason recorded anywhere.
- **Since:** 0.5.0

### DEC-05 · Codes paste, sign-in needs no puzzle

- **Rule:** A one-time code or token is one input that accepts paste, and signing in never requires solving a puzzle or retyping a value from memory.
- **Check:** Paste a code into every code input on the path; look for split boxes that reject paste, and for sign-in steps that need transcription or a puzzle without another way through.
- **Severity:** should-fix
- **Applies to:** step
- **Basis:** source — W3C, WCAG 2.2, Success Criterion 3.3.8 Accessible Authentication (Minimum) (2023), <https://www.w3.org/TR/WCAG22/#accessible-authentication-minimum>: no cognitive function test to authenticate unless an alternative or assistance exists; paste is one such assistance.
- **Pass:** A six-digit code goes into one field, and pasting it fills it.
- **Fail:** A six-digit code is split into six boxes that accept one typed character each and ignore paste.
- **Since:** 0.5.0
