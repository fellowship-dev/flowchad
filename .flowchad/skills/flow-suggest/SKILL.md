---
name: flow-suggest
description: AI-powered improvement prioritization — analyze walk results, friction reports, and trends to produce a ranked action plan. Usage /flow-suggest <flow-name>
user_invocable: true
---

# Flow Suggest

Analyze all available data for a flow and produce a prioritized list of improvements ranked by effort vs impact.

## Usage

```
/flow-suggest sign-up
/flow-suggest all          # suggestions across all flows
```

## Inputs

Gather everything available (skip what doesn't exist):

1. **Walk results** — `snapshots/{latest}-{flow-name}/results.json`
2. **Screenshots** — visual analysis of each step
3. **Friction report** — `reports/{latest}-{flow-name}-report.md`
4. **Diff/trends** — compare multiple snapshots if available
5. **Flow definition** — `flows/{flow-name}.yml`
6. **Knowledge docs** — friction taxonomy, platform types, goal setting, metrics primer
7. **Config** — `config.yml` for platform type, business goals, thresholds

## Prioritization Matrix

Rank every suggestion by **effort vs impact**:

| | Low Effort | Medium Effort | High Effort |
|---|---|---|---|
| **High Impact** | 🔥 Do now | 📋 Plan next sprint | 🗓️ Schedule |
| **Medium Impact** | ✅ Quick win | 📋 Plan | ⏭️ Backlog |
| **Low Impact** | ✅ If time permits | ⏭️ Defer | ❌ Skip |

### Effort Estimation

- **Low**: CSS/copy change, config tweak, one-line fix. < 30 minutes.
- **Medium**: Component refactor, API change, new validation. 1-4 hours.
- **High**: Architecture change, new feature, third-party integration. > 4 hours.

### Impact Estimation

Consider:
- How many users hit this flow? (P0 flows = high impact by default)
- Does the issue block task completion? (Critical = high impact)
- What's the business cost? (payment flow friction > settings page friction)
- Is it getting worse? (degrading trend = higher urgency)

## Output

```markdown
## Improvement Plan: {flow-name}

**Based on:** walk ({date}), report ({date}), {N} historical runs
**Platform type:** {saas|website|etc.}

### 🔥 Do Now (high impact, low effort)

1. **Fix 500 error on /checkout submit**
   Step 4: click submit → server error
   Impact: blocks 100% of purchases
   Fix: validate cart items count before submission (API-side)
   Effort: low (input validation)

2. **Add loading state to submit button**
   Step 4: users double-click during slow response (2.8s)
   Impact: prevents duplicate submissions
   Fix: disable button + show spinner on click
   Effort: low (CSS + JS)

### 📋 Plan Next

3. **Reduce /signup page load from 2.8s to <1.5s**
   Step 1: navigate → 2.8s (threshold: 2s), trend: degrading
   Impact: 40% of users bounce on pages >3s
   Fix: audit JS bundle, lazy-load below-fold, optimize images
   Effort: medium (performance audit)

### ✅ Quick Wins

4. **Fix password field placeholder text**
   Step 3: placeholder says "Enter pasword" (typo)
   Impact: low (cosmetic)
   Fix: correct typo in form component
   Effort: low

### ⏭️ Backlog

5. **Add password strength indicator**
   Not currently in flow, but common SaaS pattern
   Impact: medium (reduces support tickets)
   Fix: add strength meter component
   Effort: medium

---

### Summary

| Priority | Count | Est. Time |
|----------|-------|-----------|
| 🔥 Do now | 2 | ~1 hour |
| 📋 Plan next | 1 | ~3 hours |
| ✅ Quick wins | 1 | ~10 min |
| ⏭️ Backlog | 1 | ~2 hours |
```

## Cross-Flow Suggestions (when `all`)

When analyzing all flows, also identify:
- **Common friction**: same issue across multiple flows (e.g., slow navigation everywhere → CDN/performance problem)
- **Missing flows**: critical paths that have no flow definition yet
- **Coverage gaps**: pages/features with no flow coverage

## After Suggesting

Suggest next actions:
- "Create issues from these suggestions? I can draft them."
- "Run `/flow-walk {name}` after implementing fixes to measure improvement"
- "Run `/flow-diff {name}` to track progress over time"
