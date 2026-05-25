# Pre-Flight Report — Issue #28: Customer Bug Reproduction from Error Reports

**Source issue:** https://github.com/fellowship-dev/flowchad/issues/28
**Date:** 2026-05-25
**Repo:** /efs/missions/repos/fellowship-dev-flowchad-issue28

---

## Issue Summary

Given a support ticket or error report (Bugsnag, Sentry, customer email), FlowChad should attempt to reproduce the bug in-browser, producing a screen recording + structured steps-to-reproduce, then attach evidence and label the original GitHub issue.

## Open Questions — Resolved

| Question | Resolution |
|----------|-----------|
| Trigger: manual or auto on `bugsnag` label? | **Manual dispatch** — `/flow-reproduce <issue-ref>`. Auto-trigger can be a follow-on; manual is safer first. |
| Browser context: needs auth? | **Use config.yml credentials** if issue mentions authenticated flow; otherwise anonymous. Skill will prompt user to set credentials if needed. |
| Scope: frontend or API too? | **Frontend-first** (Playwright). API responses checked via `page.evaluate()` inside expect assertions where relevant. |

## What Needs Building

A new 10th skill: **`/flow-reproduce`**

### Input
- GitHub issue reference (URL or `owner/repo#number` or just `number` if default repo configured)
- Issue contains: error message, stack trace, user action description, URL

### Behavior
1. Fetch the issue from GitHub API
2. Parse error context: error class, message, URL, user action, stack trace hints
3. Infer a reproduction flow YAML from the error context
4. Execute the flow using existing flow-walk logic (Playwright CDP)
5. Capture screenshots + video at each step
6. Determine if bug is reproduced (Critical findings in walk) or not
7. Update the original issue with:
   - Label: `reproduced` or `could-not-reproduce`
   - Comment with structured steps-to-reproduce + GIF evidence

### New Files
- `.flowchad/skills/flow-reproduce/SKILL.md` — the skill implementation
- `.flowchad/commands/flow-reproduce.md` — command shortcut

### Integration Points
- Uses `flow-walk` execution model (Step 1-4 of that skill)
- Uses `evidence-upload` for screenshots/GIF
- Uses `flow-add` inference logic (Step 1-2) to build the flow
- Labels applied via `gh issue edit`
- Comment posted via `gh issue comment`

## Codebase Patterns Observed

- All skills live at `.flowchad/skills/{name}/SKILL.md`
- All commands live at `.flowchad/commands/{name}.md`
- Commands are thin wrappers that reference the skill
- Skills are fully self-contained AI execution specs (markdown)
- No test infrastructure exists (confirmed in QUALITY_SCORE.md — S5 N/A)
- All bash in skills uses POSIX-portable syntax
- Evidence upload uses `scripts/evidence-upload.sh`

## Risk Assessment

**Low risk:** Adding a new skill file doesn't modify existing skills or scripts.
**Medium complexity:** Parsing error context from free-text GitHub issues (stack traces, Bugsnag payloads, plain descriptions).
**Existing leverage:** flow-walk, evidence-upload, flow-add all cover the core execution model — flow-reproduce mainly orchestrates them.
