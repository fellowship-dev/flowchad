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
| **PASS** | The goal and the value moment were reached (with evidence, below), no blocker rule failed, every blocker that applies was judged, and the walk ran on the target host after the last deploy. |
| **PASS-WITH-OVERRIDES** | As PASS, except that one or more blocker rules failed and the flow file overrides them. Every override is listed first under known rough edges. |
| **FAIL** | The goal or the value moment was not reached, a blocker failed (by the walker's judgement or by a threshold on the measures), the walk ran on another host than the target, or it is older than the last deploy. |
| **INCOMPLETE** | Nothing failed, but something the gate needs is missing: evidence of the value moment, a judgement on a blocker, the target, the deploy time when deploys are tracked, or the rest of a walk that stopped before a write step on a read-only-live surface. |

The gate checks that a walk record is complete, judged against every blocker
rule and fresh for the stated target; it cannot prove the walk took place.
Within that, it never takes a walk's word for it:

- **The value moment needs evidence.** At least one recorded step, every step
  up to the value step with its index, status and measures, and the value step
  marked `first_value: true` and passed. A `value_reached: true` flag on its
  own is ignored. A flow map needs a path that ends on its value node.
- **Every blocker must be judged.** A pass or fail from the walker, a
  threshold measured on every step on the path, or `n/a` with the reason. A
  measure recorded on some steps only, or missing (a missing `dead_end` is not
  `false`), does not count; neither does `n/a` without a reason.
- **The target is required.** It comes from `--target` or `gate.target` in
  `.flowchad/config.yml` (or `--config <file>`). With neither, the result is
  INCOMPLETE: "target not stated". Another host or port fails.
- **Staleness is required when deploys are tracked.** If `gate.deploy_check`
  is set, or the environment whose `url` matches the target has a
  `deploy_check` other than `none`, the walk needs `--not-before <time of the
  last deploy>`; without it the result is INCOMPLETE. With no deploy check
  configured the gate notes that staleness was not checked.
- **Times must be possible.** A walk timestamp in the future is refused (bad
  input, exit 2), and so is an override whose `by:` is empty or only
  punctuation, or whose `date:` is not a real date, is in the future or is
  before the walk.

`should-fix` and `later` failures never fail the gate; they are listed as
**known rough edges**, which go first in any hand-off so the tester does not
discover them.

**Overrides** (`rule_overrides` in the flow file) are listed under known
rough edges, marked OVERRIDDEN, with who accepted them, when and why.
Overriding a `blocker` needs a reason of at least four words and twenty
characters, `by:` and `date:` (YYYY-MM-DD), and turns PASS into
PASS-WITH-OVERRIDES. PATH-01, the rule that the value moment was reached,
cannot be overridden: reach it, or change the flow's `value_moment`.

```yaml
rule_overrides:
  - id: DEC-02
    reason: the second ask is a legal re-consent that cannot be removed yet
    by: release owner
    date: 2026-11-15
```

Exit codes: 0 PASS, 1 FAIL or INCOMPLETE, 2 bad input (an unknown rule id, a
missing file, an unsafe flow id, an override that is not allowed or lacks its
reason, who or when), 3 PASS-WITH-OVERRIDES. CI that treats any non-zero exit
as a failure therefore stops on overrides until someone looks.

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

- The walk ran on the target the tester will open (`--target`, or
  `gate.target` in the config), after the last deploy (`--not-before <deploy
  time>`; required when the config tracks deploys). A local or test walk can
  still find problems; it cannot pass the gate for production.
- On production the walk is read-only (`flow-walk/references/live-safety.md`):
  it stops before write steps, so the gate says INCOMPLETE until the rest of
  the flow is walked on a test surface or a local copy of the same commit.
  Gate both results; the hand-off needs both to pass.
- Every blocker that applies has a result in `rule_results` (pass, fail or
  n/a with a reason), or a threshold measure recorded on every step.

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
previous walk, failed rules, rough edges and overrides, and findings not
covered by a rule. The flow id must be a safe name (letters, digits, `-` and
`_`); the gate refuses any other id and never writes outside the folder given.
Commit the record with the change it judged. `changed.sh` reads its `Commit:`
line next time.

**Redaction is best-effort; review a walk record before committing it.** Every
free-text field (flow name, value moment, target, reasons, evidence, override
reasons and names, not-covered findings, notes) goes through one redaction
function:

- URLs keep scheme, host and port: the tested host is the point of the
  record. User info (`user:pass@`), query strings and fragments are removed,
  and path segments that look like tokens (long hex, UUIDs, long mixed
  strings, long numbers) become `[token]`.
- Known secret shapes become `[secret]`: GitHub and Stripe-style tokens, AWS
  access key ids, JWTs, bearer tokens, private keys, long base64 strings, and
  values of secret-like keys (`token=`, `password:`, `api_key=`).
- Email addresses become `[email]`, long hex strings `[hex]`, card-like
  numbers that pass the Luhn check `[card]`, other runs of 12 or more digits
  (also grouped with spaces or hyphens) `[number]`, and phone-like numbers
  `[phone]`.
- The commit must look like a commit hash and the time like an ISO time;
  anything else is replaced.

It cannot recognise every secret or every name: an unusual token format, a
person's name or a client's product name in a finding passes through. Write
findings without them, and read the record before you commit it.

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

- blocker FOLD-01 failed: The first input is visible without scrolling

### Blockers failed

- **FOLD-01** The first input is visible without scrolling — step 3 @375: scroll_before_primary_vh = 1.4, needs scroll_before_primary_vh = 0

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
