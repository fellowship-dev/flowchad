# Plan: Issue #32 — Production Impact Verification

## Changes

### 1. `flow-report/SKILL.md` — add "File Issues for Critical Findings" section

Add after the existing "## After Report" section (or replace the implied issue-filing behavior with an explicit one).

**What changes:**
- New section "## File Issues for Critical Findings" with four sub-steps:
  1. **Resolve production URL** — check `config.yml` `environments.production.url`; fall back to BRIEF.md, Vercel CLI (`gh api`), or mark as unknown
  2. **Check if failure is on production already** — if the flow URL matches the production URL, skip the curl and assign P0/P1 directly
  3. **Curl the failed path on production** — `curl -sI -o /dev/null -w "%{http_code}" --max-time 10 {prod_url}{path}` and record status + timestamp
  4. **Assign severity and file issue** — three-case logic; include curl evidence block in issue body

**Why flow-report:** This is the skill that interprets walk results and decides what to file. The walk itself is environment-agnostic; severity assignment belongs in the report phase.

### 2. No other files change

flow-walk, flow-suggest, config.yml, and other skills are unaffected. The production-check logic is self-contained in flow-report.

## Order of Operations

1. Write spec.md (done)
2. Write plan.md (this file)
3. Write tasks.md
4. Edit `.flowchad/skills/flow-report/SKILL.md`
5. Commit all to branch `32-production-impact-severity`
6. Push and open PR
