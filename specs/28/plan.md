# Plan: flow-reproduce skill (issue #28)

## Approach

Add a single new skill file + command wrapper. No existing files modified except QUALITY_SCORE.md and SKILL.md (readme). Zero risk to existing skill behavior.

## Implementation Steps

### 1. Create `.flowchad/skills/flow-reproduce/SKILL.md`

The skill spec has five phases:

**Phase 1 — Parse issue context**
- Accept `<issue-ref>`: bare number, `owner/repo#N`, or full GitHub URL
- `gh issue view` to fetch title, body, comments as JSON
- Extract from free text:
  - Error message (grep for "Error:", "Exception:", Bugsnag `error_class`)
  - Affected URL (grep for `https?://`, route patterns `/path/...`)
  - Triggering action (keywords: "click", "submit", "navigate", "scroll", "load")
  - Auth state (keywords: "logged in", "authenticated", "signed in" vs "logged out")
- If URL cannot be extracted, ask user before proceeding

**Phase 2 — Infer reproduction flow**
- Build minimal YAML with steps to reach the error
- Steps always start with `navigate` to the affected URL
- Add a step for the triggering action if identified
- Add a `wait` step to observe the result
- Save to `.flowchad/flows/reproduce-issue-{N}.yml`
- Show inferred flow to user with "Proceeding with this flow..." (no blocking confirm — auto-proceed for CI friendliness)

**Phase 3 — Walk the flow**
- Reuse flow-walk execution model exactly
- Launch/connect browser, execute steps, capture screenshots + video
- Catch errors per step, continue (don't abort)
- Smart trim video + GIF conversion

**Phase 4 — Determine outcome**
- Reproduced if: any step status is `error` or `fail`
  OR page HTML contains error indicators (500, "something went wrong", stack trace text, Bugsnag widget)
- Could not reproduce otherwise
- Save results to `.flowchad/snapshots/{date}-reproduce-issue-{N}/results.json`

**Phase 5 — Update GitHub issue**
- Upload evidence via `scripts/evidence-upload.sh`
- Apply label via `gh issue edit --add-label reproduced` or `could-not-reproduce`
- Post structured comment via `gh issue comment`
- Comment template: outcome header + steps table + evidence inline

### 2. Create `.flowchad/commands/flow-reproduce.md`

Thin command: describes usage, links to SKILL.md.

### 3. Update `QUALITY_SCORE.md`

Add `flow-reproduce` row (initial grade B: S1 ✅, S4 ✅ (0 open), S6 ❌).

### 4. Update repo-root `SKILL.md` (README)

Add `/flow-reproduce` to the skills table.

## File Changes Summary

| File | Action |
|------|--------|
| `.flowchad/skills/flow-reproduce/SKILL.md` | **Create** (primary deliverable) |
| `.flowchad/commands/flow-reproduce.md` | **Create** |
| `QUALITY_SCORE.md` | **Update** (add domain row) |
| `SKILL.md` | **Update** (add to skills table) |

## No Changes To

- Existing skill files (flow-walk, flow-report, flow-add, etc.)
- Scripts (no new bash needed — skill orchestrates via existing scripts)
- config.yml template (no new config keys needed)

## Constraints

- Portable bash only in any inline bash (no bash 4+ features)
- Use `$ENV_VAR` references for credentials, never hardcoded
- Skill spec must be fully self-contained (AI executes from markdown only)
- Graceful degradation if browser or GitHub auth unavailable
