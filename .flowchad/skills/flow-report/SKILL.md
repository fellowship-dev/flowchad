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
/flow-report all        # one report across every flow walked in this session
```

The argument is the flow id (filename without `.yml`) or `all`. Uses the most recent snapshot for each flow, and the one before it for "what improved".

## Inputs

1. **Walk results** — load `snapshots/{latest}-{flow-name}/results.json`
2. **Screenshots** — read each step screenshot for visual analysis
3. **Video** — reference trimmed video and GIF if available (include in report)
4. **Evidence URLs** — if `results.json` contains an `evidence` key, use those URLs for inline images in the report. Otherwise fall back to local file paths.
5. **Flow definition** — load `flows/{flow-name}.yml` for context
6. **Knowledge docs** — reference `knowledge/friction-taxonomy.md` for severity classification
7. **Config** — load `config.yml` for platform type, timing thresholds, business goals
8. **Previous snapshot** — the walk before the latest one for the same flow id, if any, for the "What improved" and counts comparison
9. **Rules** — `flow-walk/rules/` and `.flowchad/rules/`; the walk's `rule_results` say which failed where
10. **Gate** — the output of `flow-gate/scripts/gate.mjs` for each flow (run it if the walk did not)

## Analysis Process

### 1. Load Data

Find the most recent snapshot directory matching the flow name:
```bash
ls -d .flowchad/snapshots/*-{flow-name} | sort -r | head -1
```

Read `results.json` and all screenshots from that directory. Also load the previous snapshot of the same flow id, if one exists. Older snapshots may lack the newer fields (`goal_reached`, `counts`, `observed_at`, per-width `screenshots`); report those as "not recorded" rather than guessing.

### 2. Classify Each Finding

For every step that isn't a clean pass, classify using `knowledge/friction-taxonomy.md`:

**Critical** — user cannot complete the task:
- Step status is `error` or `fail` on a non-optional step
- Navigation failure (page didn't load)
- Form submission returned server error
- Redirect loop or dead end
- `goal_reached` is false
- A `truth_checks` entry disagrees with the independent fact and people would act on the claim

**Friction** — user can complete but experience is painful:
- Step flagged as `slow` (exceeded timing threshold)
- Expect partially met (page loaded but content wrong)
- Extra steps needed that aren't in the flow (unexpected modal, cookie banner)
- Confusing UI observed in screenshot
- Console errors or failed requests on a step that otherwise passed
- A dead end the person can only leave with help

**Cosmetic** — works fine but looks rough:
- Minor visual issues spotted in screenshots
- Alignment, spacing, contrast problems
- Truncated text, placeholder text visible

### 2a. Findings From the Rules

Every failed rule in the gate output is a finding: the rule id goes in its title (`FOLD-01: the only input is below the fold at 375`). A failed `blocker` rule is a launch blocker; `should-fix` and `later` rules rank as their severity says unless frequency or flow priority moves them up. A finding that no rule covers keeps its place in the ranking and is also listed under "Not covered by a rule" as a candidate for a new rule.

### 2b. Rank Each Finding for Action

Severity says how bad it is for the person; rank says what to do about it. Use the ranking in `knowledge/friction-taxonomy.md`:

- **Launch blocker** — a flow does not reach its goal, or the product states something untrue that people will act on.
- **Should fix** — the goal is reached but with avoidable friction, confusion or risk.
- **Later** — polish.

For every finding record: the screen, the **exact words the person sees** (quoted, not paraphrased), why it hurts, the smallest fix, and who must act: **owner** (a decision or account setting outside the code: booking, payment, DNS, email provider, copy approval) or **code**.

### 2c. Re-check the Environment Before Writing

Findings about DNS, TLS, redirects, deploys or third-party pages go stale fast. Right before writing the report, re-check each one, judging by rendered content rather than status code, and record the time. If it now works, move it to "Resolved during the walk" instead of listing it as a blocker. Every finding shows when it was observed.

### 3. Consider Platform Type

Reference `knowledge/platform-types.md` and `config.yml`:
- **SaaS**: prioritize onboarding/activation friction
- **Website**: prioritize page load speed, mobile, SEO
- **Internal tool**: prioritize efficiency, error handling
- **Mobile**: prioritize touch targets, viewport, orientation

### 4. Generate Suggestions

For each finding, provide:
- **What's wrong** — the screen and the exact words
- **Why it matters** — impact on reaching the goal
- **Smallest fix** — the one change that removes the problem
- **Who** — owner or code
- **Effort estimate** — low / medium / high

### 5. Cross-Reference Speckit (if available)

If `.speckit/` exists in the project, check:
- Does the observed behavior match the spec?
- Flag spec violations as separate findings
- Note if a spec is missing for a critical flow

## Output

Generate a markdown report at:
```
.flowchad/reports/{YYYY-MM-DD}-{flow-name}-report.md   # or {YYYY-MM-DD}-all-report.md
```

`reports/` stays git-ignored: it can quote signed-in screens. The durable part goes to `.flowchad/walks/{YYYY-MM-DD}-{flow-id}.md`, written by `gate.mjs --record .flowchad/walks` (gate, measures, rule results, rough edges, not-covered findings; text only, redacted best-effort: see flow-gate § Run it). Read it before committing, and commit it with the change it judged: it is the history the next walk compares against, and `/flow-gate --changed` reads its `Commit:` line.

### Report Template

Keep it scannable: the person reading it decides what to fix today. Quote screen text exactly; never paste secrets, cookies or real account details.

```markdown
# Walk Report: {project} — {YYYY-MM-DD}

**Written:** {timestamp} · **Previous walk:** {date or "none"} · **Rules:** {rules_version}

## Gate
| Flow (id) | Gate | Why | Known rough edges |
|---|---|---|---|
| {id} | PASS / FAIL / INCOMPLETE | {failed blockers, not judged, goal, target} | {count; ids} |

Do not hand a flow to a human tester unless its gate is PASS. On PASS, list its rough edges first in the hand-off.

## Surfaces
| Surface | Mode | Notes |
|---|---|---|
| {url} | read-only-live | writes blocked: {N} requests |
| {local url} | local-copy @ {commit} | test keys, captured mail |

## Does each flow reach its goal today?
| Flow (id) | Goal | Reached? | Where it stops | Since last walk |
|---|---|---|---|---|
| {id} | {goal} | yes / no / not walked (why) | {step, screen, "exact words"} | {fixed / new / same} |

## Launch blockers
### 1. {Title}
- **Screen:** {flow id, step N, URL path} · observed {time}, re-checked {time}
- **What the person sees:** "{exact words}"
- **Why it hurts:** {impact on reaching the goal}
- **Smallest fix:** {one change}
- **Who:** owner ({booking/payment/DNS/...}) | code · **Severity:** Critical | Friction | Cosmetic
- **Evidence:** {screenshot path or approved URL}

## Should fix
...

## Later
...

## Untrue statements
| Screen | What it claims | Independent fact | Source |
|---|---|---|---|

## Measures against the previous walk
| Flow | Measure | Previous | Now | Change |
|---|---|---|---|---|
| {id} | screens_to_value, decisions_to_value, fields_to_value, clicks_to_value, words_to_value, max_scroll_before_primary_vh (1440 · 375), non_task_elements_to_value, waits / longest_wait_ms, dead_ends, loops, time_to_value_ms | | | |

A measure that got worse needs a reason in one line. Thresholds come only from rules with a cited source; the rest are compared with the previous walk.

## Rule results
| Rule | Severity | Result | Where | What was seen |
|---|---|---|---|---|
| {id} | blocker / should-fix / later | fail / accepted ({reason}) | {step, width} | "{exact words}" or the measure |

## Not covered by a rule
- {finding with no rule, worded without the product's nouns}: candidate if it can be worded generally and has a source or a second independent flow

## Effort and time to first value
| Flow | Typed fields | Clicks | Time to first value | Previous |
|---|---|---|---|---|

## Dead ends
| Case | What the person sees | Can recover? |
|---|---|---|

## Errors per step
{console errors and failed requests, grouped by flow and step; omit if none}

## What improved since last walk
- {finding that is gone, count that went down, flow that now reaches its goal}

## Resolved during the walk
- {environmental finding, first seen {time}, working at {time}}

## Where this differs from production
- {for each local-copy or test surface: commit, simulated steps, settings left at defaults, switches turned on to reach a screen, test keys}

## Residual risk
- {pages opened on live systems that might write on view; human-assisted steps}
- {every `unguarded` note from the walk, and any unverified mode used: Firefox/WebKit, a CDP-attached browser's existing context, shared workers, 307/308-redirected POSTs, Playwright < 1.48}

## Left running
- {nothing, or what and why}
```

## File Issues for Critical Findings

For every Critical finding in the report, file a GitHub issue. Embed screenshots only if they are already published under the evidence rules in `flow-walk/references/live-safety.md` §4; otherwise reference local paths. Before assigning P0/P1, **verify whether production is actually affected**.

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
# PATH_TO_CHECK: the route that failed, e.g. /es/pricing
PROD_CHECK=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 "${PROD_URL}${PATH_TO_CHECK}" 2>/dev/null)
CHECK_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

If `PATH_TO_CHECK` is just a domain (no path), use `/`.

A `2xx` does not prove production is healthy. If the finding is about content (an empty list, "nothing available", wrong words) or the page renders client-side, open the production page in a browser and judge what it shows; record that in the issue instead of the status code alone.

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
