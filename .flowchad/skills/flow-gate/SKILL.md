---
name: flow-gate
description: Decide whether a walked flow may be handed to a human tester — pass/fail against the rules' blockers, measures against the previous walk, known rough edges, and which flows a change touches. Usage /flow-gate <flow-name|all> [--changed] [--target <url>]
user_invocable: true
---

# Flow Gate

"Test it" is the last step, not the first. The gate says whether a flow is
ready for a person to test, and if not, exactly why. It is mechanical: the
same walk results give the same answer.

## Usage

```
/flow-gate sign-up                              # latest walk of one flow
/flow-gate all --target https://www.example.com # every flow, on the address the tester will open
/flow-gate --changed                            # which flows this branch touches, then gate those
```

## What it checks

`scripts/gate.mjs` reads the latest `results.json` of the flow (and the one
before it), the rules in `flow-walk/rules/` plus the project's
`.flowchad/rules/`, and decides:

| Status | When |
|---|---|
| **PASS** | The goal and the value moment were reached, no blocker rule failed, every blocker that applies was judged, and (when given) the walk ran on the target host after the last deploy. |
| **FAIL** | The goal or the value moment was not reached, a blocker failed (by the walker's judgement or by a threshold on the measures), the walk ran on another host than `--target`, or it is older than `--not-before`. |
| **INCOMPLETE** | Nothing failed, but the walk stopped before a write step on a read-only-live surface, or a blocker was never judged. Walk the rest on a test surface or judge the rule. |

`should-fix` and `later` failures never fail the gate; they are listed as
**known rough edges**, which go first in any hand-off so the tester does not
discover them. Overrides from the flow file (`rule_overrides`, each with a
reason) are listed as accepted exceptions.

Exit codes: 0 PASS, 1 FAIL or INCOMPLETE, 2 bad input (an unknown rule id, a
missing file, an override without a reason).

## Process

### 1. Which flows

With `--changed`, run `scripts/changed.sh` from the project root first. It
compares each saved flow with the commit of its last walk record (or `--base
<ref>`) and prints `walk`, `maybe` or `skip` per flow, from the flow's
`covers:` globs, the flow file itself, and its step URLs. Walk every `walk`
flow again; read the `maybe` ones and walk them unless the change clearly
cannot reach them. A flow without `covers:` is always `maybe`: add the globs.

Otherwise use the named flow, or every flow with a snapshot for `all`.

### 2. Make sure the walk is the one that counts

The gate judges a walk; it does not make one. Before running it:

- The walk ran on the target the tester will open (pass `--target`), after
  the last deploy (pass `--not-before <deploy time>` when known). A local or
  test walk can still find problems; it cannot pass the gate for production.
- On production the walk is read-only (`flow-walk/references/live-safety.md`):
  it stops before write steps, so the gate says INCOMPLETE until the rest of
  the flow is walked on a test surface or a local copy of the same commit.
  Gate both results; the hand-off needs both to pass.
- Every blocker that applies has a result in `rule_results` (pass, fail or
  n/a with a reason), or a threshold measure.

### 3. Run it

```bash
GATE=$(ls .flowchad/skills/flow-gate/scripts/gate.mjs \
          .claude/skills/flow-gate/scripts/gate.mjs \
          .agents/skills/flow-gate/scripts/gate.mjs 2>/dev/null | head -1)
LATEST=$(ls -d .flowchad/snapshots/*-"$FLOW" | sort | tail -1)
PREV=$(ls -d .flowchad/snapshots/*-"$FLOW" | sort | tail -2 | head -1)
node "$GATE" "$LATEST/results.json" \
  $( [ "$PREV" != "$LATEST" ] && echo --previous "$PREV/results.json" ) \
  --target "$TARGET_URL" --record .flowchad/walks
```

`--record .flowchad/walks` writes the durable walk record
(`.flowchad/walks/<date>-<id>.md`): gate status, reasons, measures against the
previous walk, failed rules, rough edges, accepted exceptions and findings
not covered by a rule. It is text only, with email addresses, long numbers
and URL query strings redacted, so it can be committed to the project. Commit
it with the change it judged. `changed.sh` reads its `Commit:` line next time.

A flow map gets the same gate: `node flow-walk/scripts/flowmap.mjs
.flowchad/flows/<id>.map.md --out <file>` makes a map result; add the walker's
`rule_results` for the rules that apply to `map`, then run the gate on it.

### 4. Report

Print the gate output. On FAIL or INCOMPLETE, say plainly: **do not hand this
to a human tester yet**, and list what must change. On PASS, the hand-off
message is, in order: what to test and the link; the known rough edges, one
line each; the measures against the previous walk; the path of the walk
record.

## Output example

```
## Gate: FAIL — new-user-sets-up-their-first-site

Not ready: do not hand this to a human tester until these pass.

- blocker FOLD-01 failed: The primary action is visible without scrolling

### Blockers failed

- **FOLD-01** The primary action is visible without scrolling — step 3 @375: scroll_before_primary_vh = 1.4, needs scroll_before_primary_vh = 0

### Known rough edges (2)

- **NOISE-01** (should-fix) Everything visible serves the step — step 3: plan badge, promo banner
- **WAIT-03** (should-fix) Outside waits are explained — step 4: "Still waiting"

### Measures (previous walk 2026-11-12T15:30:00-03:00)

| Measure | Previous | Now | Change |
|---|---|---|---|
| `screens_to_value` | 7 | 5 | -2 |
| `decisions_to_value` | 6 | 3 | -3 |
| `max_scroll_before_primary_vh` | 1440: 0.6 · 375: 2.1 | 1440: 0 · 375: 1.4 | |
```
