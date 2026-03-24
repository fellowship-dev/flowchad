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


## Friction

### 2. {Title}
...


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

## After Report

Print the report to the user and note the saved path. Suggest:
- "Run `/flow-walk {name}` again after fixes to track improvement"
- "Run `/flow-suggest {name}` for AI-prioritized improvement plan" (once suggest skill exists)
