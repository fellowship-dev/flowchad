# Friction Taxonomy

How to classify findings by severity. Every finding from a flow evaluation maps to exactly one of three levels: **Critical**, **Friction**, or **Cosmetic**.

## Severity Levels

### Critical

The user **cannot complete** their intended task, or the system produces **incorrect/dangerous results**.

**Criteria (any one is sufficient):**
- Task completion is blocked (dead end, infinite loop, crash)
- Data loss or corruption occurs
- Security vulnerability is exposed to the user
- User is charged incorrectly or payment fails silently
- Legal/compliance requirement is violated
- Accessibility barrier prevents an entire user group from proceeding

**Examples:**
- Sign-up form submits but account is never created
- "Save" button does nothing; user loses work
- Password reset link expires before email arrives
- Checkout completes but order is not recorded
- Screen reader cannot access primary navigation

### Friction

The user **can complete** the task, but the experience is **unnecessarily difficult, slow, confusing, or error-prone**.

**Criteria (any one is sufficient):**
- Extra steps that serve no user purpose
- Ambiguous labels or instructions that cause hesitation
- Latency that disrupts the user's flow of thought (> 2s for interactive actions)
- Error messages that do not explain what went wrong or what to do next
- Layout or interaction patterns that contradict platform conventions
- Information the user needs is hidden, truncated, or requires extra navigation
- Undo/recovery is possible but non-obvious

**Examples:**
- User must re-enter data after a validation error clears the form
- Search returns results but with no indication of why they matched
- Settings page requires a full reload to reflect changes
- Mobile tap target is technically hittable but smaller than 44x44px
- Date picker defaults to January 1900 instead of today

### Cosmetic

The user **can complete the task without difficulty**, but the presentation is **inconsistent, unpolished, or below quality standards**.

**Criteria (any one is sufficient):**
- Visual inconsistency (mismatched fonts, colors, spacing) with no functional impact
- Typos, grammar errors, or awkward copy
- Animation jank or missing transitions
- Favicon missing or incorrect
- Tooltip overlap that resolves on mouse movement
- Placeholder content left in production ("Lorem ipsum")

**Examples:**
- Button color differs from the design system spec by a few shades
- Footer links are slightly misaligned on one breakpoint
- Loading spinner appears for 50ms creating a flash
- Console warnings in production (no user-visible effect)

## Decision Tree

Use this sequence to classify a finding:

```
1. Can the user complete their intended task?
   NO  --> Critical
   YES --> continue

2. Did the user experience unnecessary difficulty, delay, or confusion?
   YES --> Friction
   NO  --> continue

3. Is there a visual or polish issue that doesn't affect task completion or ease?
   YES --> Cosmetic
   NO  --> Not a finding (working as intended)
```

## Edge Cases

| Scenario | Classification | Reasoning |
|---|---|---|
| Page loads in 8 seconds but is fully functional | **Friction** | User can complete the task, but latency disrupts flow. Not Critical because the task is still completable. |
| Feature works in Chrome but is broken in Safari | **Critical** | A supported browser cannot complete the task. If Safari is not a supported browser, downgrade to Friction. |
| Error message says "Error 500" with no guidance | **Friction** | If the user can retry or navigate away and recover, it's Friction. If the error traps them in a dead end, it's Critical. |
| Form accepts invalid email format silently | **Critical** | Downstream failure is inevitable (account creation, password reset). Silent acceptance of bad data = data corruption path. |
| Contrast ratio is 4.4:1 instead of required 4.5:1 | **Cosmetic** | Barely below spec, no practical readability impact. If contrast is below 3:1 and text is unreadable, upgrade to Friction. |
| Feature requires workaround (refresh, back button) | **Friction** | Task is completable via workaround. If the workaround is non-discoverable (user would give up), upgrade to Critical. |
| Mobile keyboard covers the input field | **Friction** | User can scroll to reveal it, but shouldn't have to. If scrolling doesn't help and input is unreachable, Critical. |
| Third-party widget fails to load | Depends | If it blocks the primary flow: Critical. If it's supplementary (analytics badge, social proof): Cosmetic. |

## Severity Modifiers

Severity can shift based on context:

- **Frequency**: A Friction issue on the most-used flow is higher priority than a Critical issue on a flow used once per year.
- **User segment**: Issues affecting paying customers or new users during onboarding carry more weight.
- **Workaround availability**: A well-known, documented workaround can downgrade a Critical to Friction for prioritization (but not for classification — the finding stays Critical).
- **Trend direction**: A Friction issue that is getting worse over time (regression) should be flagged even if the current state is borderline.

## Rules for the AI

1. **Classify based on the finding, not the fix.** A one-line CSS fix can resolve a Critical issue. Difficulty of the fix is irrelevant to severity.
2. **When in doubt between two levels, choose the higher one.** It is better to over-classify and be corrected than to under-classify and miss a real problem.
3. **Always state the reasoning.** Every classification must include a one-sentence justification referencing the criteria above.
4. **One finding, one classification.** If a single observation spans multiple severities (e.g., a form that is both visually broken AND blocks submission), classify at the highest applicable level.
