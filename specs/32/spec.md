# Spec: Verify production impact before assigning severity (issue #32)

## Problem Statement

FlowChad's `flow-report` skill files GitHub issues for Critical findings without first checking whether the failure affects real production users. This led to:
- fellowship-dev/farmesa#84: P0 "500 error" was on `farmesa.vercel.app` (stale alias), not `farmesa.cl` (production, healthy)
- fellowship-dev/fellowship-dev-homepage-v2#25, #27: `/es` locale 404 on English-only site

A test failure on a staging/preview domain is not a P0. Severity must reflect actual user impact.

## Acceptance Criteria

1. When `flow-report` is about to file a GitHub issue for a Critical finding, it first resolves the production URL.
2. It curls the equivalent path on production and records the HTTP status + timestamp.
3. Severity is assigned based on the curl result:
   - Production also fails (non-2xx) → **P0/P1** (current behavior)
   - Production returns 200 → **P2** (regression risk, not live impact)
   - Production URL unknown → **P1** with "unverified" note, request manual check
4. The filed issue body includes the production curl result as evidence (status code + timestamp + URL checked).
5. Behavior only applies when the failed URL differs from the production URL (i.e., failure is on staging/preview).

## Skill Files That Need Changes

### `flow-report/SKILL.md` — primary change
- The report currently classifies Critical findings and says "Print the report."
- Issue filing is implied for Critical findings (AI interprets this and files).
- **Add**: a new "## File Issues for Critical Findings" section that:
  1. Resolves the production URL (from `config.yml` → `environments.production.url`, then `BRIEF.md`, then Vercel CLI, then falls back to unknown)
  2. Curls the failed path on production
  3. Decides severity using the three-case logic
  4. Writes the issue body with curl evidence included

## Open Questions (answered)

**Q: Where is the production URL stored?**
A: `config.yml` has an `environments.production.url` field (see schema). Falls back to: BRIEF.md `production:` field, `gh api` Vercel project settings, or unknown.

**Q: What if the failed URL IS the production URL?**
A: No curl needed — treat as P0/P1 directly.

**Q: What if there are multiple Critical findings across different paths?**
A: Curl each unique path on production. One curl per finding.

**Q: Does flow-walk also file issues?**
A: No. flow-walk stores results; flow-report generates the report and files issues. Only flow-report needs changing.
