# Spec: Customer bug reproduction from error reports (issue #28)

## Problem Statement

Support engineers and developers receive bug reports via Bugsnag, Sentry, customer emails, or internal tickets. Today, reproducing those bugs requires:
1. Reading the error report
2. Manually setting up a browser session
3. Navigating to the affected page
4. Attempting to trigger the same conditions

This is slow, inconsistent, and often skipped — leading to PRs that fix the wrong thing or miss the root cause entirely. FlowChad already has the infrastructure to walk user flows in-browser and capture evidence. Issue #28 asks us to apply that infrastructure to bug reproduction.

## Acceptance Criteria

1. **`/flow-reproduce <issue-ref>`** is a valid FlowChad command that accepts a GitHub issue reference (URL, `owner/repo#N`, or bare `N` with configured default repo).

2. The skill fetches the issue body and comments from GitHub, then parses the following from the error context:
   - Error class and message (from Bugsnag/Sentry payloads or plain text)
   - Affected URL or route (where the error occurred)
   - User action that triggered the error (click, form submit, navigation)
   - Stack trace hints (method/file for context, not executed)
   - Auth state (logged in vs anonymous, inferred from context)

3. The skill infers a **reproduction flow YAML** from the parsed context — a minimal set of steps to navigate to the error, perform the triggering action, and observe the result.

4. The inferred flow is walked in-browser using the existing Playwright CDP execution model (same as `flow-walk`). Screenshots and video are captured.

5. After the walk, the skill determines the reproduction outcome:
   - **Reproduced**: at least one step returned `error` or `fail`, OR the page shows visible error indicators matching the report
   - **Could not reproduce**: all steps passed with no error indicators matching the report

6. The original GitHub issue is updated with:
   - Label `reproduced` or `could-not-reproduce` applied via `gh issue edit`
   - A structured comment containing:
     - Reproduction outcome header
     - Steps attempted (numbered, matching the inferred flow)
     - Evidence: screenshot + GIF embedded inline
     - Environment context (URL, browser, date)

7. The inferred flow YAML is saved to `.flowchad/flows/reproduce-issue-{N}.yml` so it can be re-run after a fix attempt.

8. The skill handles graceful degradation:
   - If no URL can be inferred from the issue, it asks the user before proceeding
   - If the walk itself errors (browser unavailable), it documents what was attempted and posts a `could-not-reproduce` comment with the error
   - If GitHub auth is unavailable, it writes results locally and prints the comment text for manual posting

## Skill Files

### New: `.flowchad/skills/flow-reproduce/SKILL.md`
Full skill implementation. Covers: parsing, flow inference, walk execution, outcome determination, issue update.

### New: `.flowchad/commands/flow-reproduce.md`
Thin command wrapper pointing to the skill.

### Modified: `QUALITY_SCORE.md`
Add `flow-reproduce` domain row once skill ships.

### Modified: `README.md` (SKILL.md at repo root)
Add `/flow-reproduce` to the nine (now ten) skills table.

## Non-Goals

- Automatic trigger on `bugsnag` label (follow-on issue; manual dispatch is v1)
- Reproducing bugs that require specific database state or seed data
- Multi-step auth flows with OAuth/SSO (future: Navvi persona)
- API-only bugs with no browser-observable symptom (flow-reproduce is browser-first)
- Modifying or closing the source issue — only add label + comment

## Design Decisions

**Why save the flow YAML?** So the fix author can re-run `/flow-walk reproduce-issue-28` after their change to verify the fix. The flow becomes a regression test artifact.

**Why `could-not-reproduce` instead of silence?** Silence creates ambiguity — was it reproduced and missed, or never attempted? An explicit label and comment prevents wasted investigation.

**Why use existing `flow-walk` execution model?** Re-use over re-implementation. flow-walk's error handling (catch errors, continue, take screenshot) is exactly what reproduction needs.

**Trigger design (manual v1):** Auto-trigger on `bugsnag` label has race conditions (issue created before Bugsnag body is appended). Manual dispatch avoids this and lets the user verify the inferred flow before it runs.
