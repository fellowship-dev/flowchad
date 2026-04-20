---
name: flow-report
description: Generate a categorized friction report from walk results — Critical/Friction/Cosmetic findings with actionable suggestions. Usage /flow-report <flow-name>
user_invocable: true
---

# Flow Report

Analyze walk results and generate a categorized friction report.

## Usage

```
/flow-report sign-up
/flow-report login
```

The argument is the flow name. Uses the most recent snapshot for that flow.

## Inputs

1. **Walk results** — load `snapshots/{latest}-{flow-name}/results.json`
2. **Screenshots** — read each step screenshot for visual analysis
3. **Video** — reference trimmed video and GIF if available (include in report)
4. **Evidence URLs** — if `results.json` contains an `evidence` key, use those URLs for inline images in the report. Otherwise fall back to local file paths.
5. **Flow definition** — load `flows/{flow-name}.yml` for context
6. **Knowledge docs** — reference `knowledge/friction-taxonomy.md` for severity classification
7. **Config** — load `config.yml` for platform type, timing thresholds, business goals

## Analysis Process

### 1. Load Data

Find the most recent snapshot directory matching the flow name:
```bash
ls -d .flowchad/snapshots/*-{flow-name} | sort -r | head -1
```

Read `results.json` and all screenshots from that directory.

### 2. Classify Each Finding

For every step that isn't a clean pass, classify using `knowledge/friction-taxonomy.md`:

**Critical** — user cannot complete the task:
- Step status is `error` or `fail` on a non-optional step
- Navigation failure (page didn't load)
- Form submission returned server error
- Redirect loop or dead end

**Friction** — user can complete but experience is painful:
- Step flagged as `slow` (exceeded timing threshold)
- Expect partially met (page loaded but content wrong)
- Extra steps needed that aren't in the flow (unexpected modal, cookie banner)
- Confusing UI observed in screenshot

**Cosmetic** — works fine but looks rough:
- Minor visual issues spotted in screenshots
- Alignment, spacing, contrast problems
- Truncated text, placeholder text visible

### 3. Consider Platform Type

Reference `knowledge/platform-types.md` and `config.yml`:
- **SaaS**: prioritize onboarding/activation friction
- **Website**: prioritize page load speed, mobile, SEO
- **Internal tool**: prioritize efficiency, error handling
- **Mobile**: prioritize touch targets, viewport, orientation

### 4. Generate Suggestions

For each finding, provide:
- **What's wrong** — specific observation
- **Why it matters** — impact on user/business
- **Suggested fix** — concrete, actionable recommendation
- **Effort estimate** — low / medium / high

### 5. Cross-Reference Speckit (if available)

If `.speckit/` exists in the project, check:
- Does the observed behavior match the spec?
- Flag spec violations as separate findings
- Note if a spec is missing for a critical flow

## Output

Generate a markdown report at:
```
.flowchad/reports/{YYYY-MM-DD}-{flow-name}-report.md
```

### Report Template

```markdown
# Friction Report: {Flow Name}

**Date:** {timestamp}
**Flow:** {flow-name}
**URL:** {base_url}
**Pass rate:** {passed}/{total} steps ({pass_rate}%)
**Duration:** {total_duration}

---

## Critical

### 1. {Title}
**Step {N}:** {action} → {target}
**Observed:** {what happened}
**Expected:** {what should happen}
**Impact:** {why this matters}
**Fix:** {suggested fix}
**Effort:** {low|medium|high}
**Screenshot:** ![Step {N}]({evidence_url or local path})

---

## Friction

### 2. {Title}
...

---

## Cosmetic

### 3. {Title}
...

---

## Summary

| Category | Count |
|----------|-------|
| Critical | N |
| Friction | N |
| Cosmetic | N |

**Overall assessment:** {one-line verdict}

**Video:** [{flow-name}-trimmed.mp4](snapshots/{date}-{flow-name}/{flow-name}-trimmed.mp4) ({Xs} trimmed from {Ys})
**GIF:** ![Walk recording]({evidence_gif_url or local path})

**Recommended next steps:**
1. {highest priority fix}
2. {second priority}
3. {third priority}
```

## File Issues for Critical Findings

For every Critical finding in the report, file a GitHub issue. Before assigning P0/P1, **verify whether production is actually affected**.

### Step 1: Resolve the Production URL

Check in priority order:

1. `config.yml` → `environments.production.url`
2. `BRIEF.md` in the project root — grep for `production:` or `prod:` URL
3. `gh api /repos/{owner}/{repo} --jq .homepage` (GitHub repo homepage field)
4. If all fail, mark as `UNKNOWN`

```bash
# Detect repo
REPO=$(git remote get-url origin | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')

# Try GitHub homepage as last resort
gh api "/repos/${REPO}" --jq '.homepage // empty' 2>/dev/null
```

### Step 2: Determine if a Production Check Is Needed

Extract the base URL from `results.json` → `config.url`.

- If the flow ran against the **production URL** already → no curl needed, assign **P0/P1** directly.
- If the flow ran against a staging/preview/alias URL (different from production) → proceed to Step 3.
- If production URL is `UNKNOWN` → skip curl, assign **P1 unverified** (Step 4, Case C).

### Step 3: Curl the Failed Path on Production

For each Critical finding, extract the path from the failed step and curl it on production:

```bash
# PATH_TO_CHECK: the route that failed, e.g. /es/tools/booster-pack
PROD_CHECK=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 "${PROD_URL}${PATH_TO_CHECK}" 2>/dev/null)
CHECK_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

If `PATH_TO_CHECK` is just a domain (no path), use `/`.

### Step 4: Assign Severity and File Issue

**Case A — Production also fails** (`PROD_CHECK` is non-2xx or curl errors):
- Severity: **P0** (for `error` status) or **P1** (for `fail` status)
- Issue title: `[P0] {finding title}`
- Production is broken for real users

**Case B — Production returns 200, staging/preview fails**:
- Severity: **P2**
- Issue title: `[P2] {finding title} (staging only — prod healthy)`
- This is a regression risk, not a live outage

**Case C — Production URL unknown**:
- Severity: **P1**
- Issue title: `[P1] {finding title} (production status unverified)`
- Body must include: "⚠️ Could not resolve production URL. Manual check required before treating this as P0."

### Issue Body Template

Every filed issue must include a **Production Check** evidence block:

```markdown
## Finding

**Flow:** {flow-name}
**Step {N}:** {action} → {target}
**Observed:** {what happened}
**Expected:** {what should have happened}
**Snapshot:** {date}

## Evidence

**Walk URL:** {flow base URL}
**Screenshot:** ![Step {N}]({evidence_url})
**GIF:** ![Walk recording]({gif_url})

## Production Check

| Field | Value |
|-------|-------|
| URL checked | {prod_url}{path} |
| HTTP status | {status_code or "curl failed"} |
| Timestamp | {ISO timestamp} |
| Result | {Production also failing / Production healthy (200) / Production URL unknown — manual check required} |

## Suggested Fix

{suggested_fix from report}

**Effort:** {low|medium|high}

---
*Filed by FlowChad flow-report — walk snapshot: {snapshot_dir}*
```

### Severity Label Mapping

| Case | GitHub label | Priority prefix |
|------|-------------|-----------------|
| Production fails | `P0` or `P1` | `[P0]` or `[P1]` |
| Production 200, staging fails | `P2` | `[P2]` |
| Production unknown | `P1` | `[P1]` |

Use `gh label create` if the label doesn't exist yet:

```bash
gh label create "P0" --color "B60205" --description "Production broken" 2>/dev/null || true
gh label create "P1" --color "D93F0B" --description "High severity" 2>/dev/null || true
gh label create "P2" --color "E4E669" --description "Staging only, prod healthy" 2>/dev/null || true
```

File the issue:
```bash
gh issue create \
  --repo "${REPO}" \
  --title "{severity_prefix} {finding_title}" \
  --body "{issue_body}" \
  --label "{severity_label},flowchad"
```

## After Report

Print the report to the user and note the saved path. Suggest:
- "Run `/flow-walk {name}` again after fixes to track improvement"
- "Run `/flow-suggest {name}` for AI-prioritized improvement plan" (once suggest skill exists)
