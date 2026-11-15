# FlowChad rules

FlowChad is opinionated. A walk is not only "did the page load and the goal get
reached"; it is judged against the rules in this folder, and the report says
which ones failed, where, and what the person saw. The rules are about the
cost of getting to value: how many screens, decisions, words and scrolls stand
between a person and the first thing they came for, and whether the product is
honest and recoverable on the way.

Every rule can be passed or failed by looking at one step, one flow, one flow
map or one docs walk. Every rule says where it comes from. A rule without a
basis is a hunch, and hunches are not admitted.

## Files

| File | Prefix | Concern |
|---|---|---|
| [path-to-value.md](path-to-value.md) | `PATH` | Value moment, flow shape, steps that earn their place |
| [primary-action.md](primary-action.md) | `FOLD` | The one thing a step needs, the fold, both widths |
| [decisions.md](decisions.md) | `DEC` | Decisions and inputs asked of the person |
| [noise.md](noise.md) | `NOISE` | Non-task elements, badges, banners, text volume |
| [wording.md](wording.md) | `WORD` | Labels, actions, warnings, consistent and true words |
| [navigation.md](navigation.md) | `NAV` | Menu order, orientation, leaving and coming back |
| [waiting.md](waiting.md) | `WAIT` | Waits, outside dependencies, empty states |
| [errors.md](errors.md) | `ERR` | Errors and dead ends |
| [docs-cold-start.md](docs-cold-start.md) | `DOCS` | A fresh reader or agent installing from the docs |
| [agent-experience.md](agent-experience.md) | `AGENT` | Agents acting for a person: access, commands, errors |
| [CHANGELOG.md](CHANGELOG.md) | | Every rule added, changed, retired or not admitted |

Measures named by rules are defined in
[`../references/measures.md`](../references/measures.md).

## Rule format

```markdown
### PATH-01 · Short title

- **Rule:** One sentence a reviewer can pass or fail on a screen, step or flow.
- **Check:** What to observe or count during the walk, and what counts as a fail.
- **Measure:** `screens_to_value` (optional: a measure from references/measures.md)
- **Threshold:** `scroll_before_primary_vh = 0` (optional, only with a cited source)
- **Severity:** blocker | should-fix | later
- **Applies to:** step, flow, map, docs, agent (one or more)
- **Basis:** source — Author, *Title* (year), <https://…>: what it says that supports the rule.
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** A product-neutral example that passes.
- **Fail:** A product-neutral example that fails.
- **Since:** 0.5.0
```

Optional lines: `**Replaces:** ID` (this rule supersedes a retired one),
`**Retired:** <version> — <reason>` and `**Replaced by:** ID`.

**Severity** feeds the gate. `blocker` fails the gate and must be judged on
every walk it applies to; `should-fix` and `later` are listed as known rough
edges. The words match the report's ranking (launch blocker / should fix /
later).

**Threshold** syntax: `measure op number` or `measure = true|false`, optionally
followed by `when measure op number`. `op` is one of `=`, `<=`, `>=`, `<`, `>`.
Example: `wait_feedback = true when wait_ms >= 2000`. The gate applies
thresholds mechanically to the walk's measures; everything else is judged by
the walker and recorded in `rule_results`.

## Admission test

A rule enters this folder only if it meets all of these. The ones marked
*(lint)* are enforced by `../scripts/lint_rules.sh`; the rest are the
reviewer's job in the pull request that adds the rule.

1. **General.** No product names, vendor names, client names or product-internal
   nouns in the rule, check or examples. It must make sense for a product the
   author has never seen. *(lint: the terms in `forbidden-terms.txt`, plus any
   private list you pass in `FLOWCHAD_FORBIDDEN_TERMS`)*
2. **Checkable.** The rule is one sentence, and the check says what to look at
   or count and what a fail looks like. "Feels cluttered" is not a check;
   "a badge, banner or widget visible on the step that the step does not need"
   is. *(lint: one sentence, at most 45 words, check present)*
3. **Based.** At least one `source` basis naming a public source with a link,
   or a `field` basis showing the rule failed in **at least two independent
   flows** (different user goals, not two screens of one flow). Field notes
   name no person, client or product: they say only how many flows and
   products, and "maintainer field note" with the month. *(lint)* The reviewer
   checks that the source really says what the line claims.
4. **No silent contradiction.** A rule that reverses, narrows or widens an
   existing rule replaces it: the new rule says `Replaces: ID`, the old one is
   retired in the same change. *(lint: a replaced rule must be retired)* The
   reviewer reads the group for conflicts.
5. **Severity set.** *(lint)*
6. **Examples.** One passing and one failing example, product-neutral
   (`example.com`, "a setup wizard", "a billing page"). *(lint)*
7. **Provenance.** `Since:` and a line in [CHANGELOG.md](CHANGELOG.md) naming
   the rule id. *(lint)*
8. **Thresholds only where a source sets them.** A rule with a `Threshold` has
   a `source` basis; field notes do not set numbers. *(lint)* Everything else is
   measured against the previous walk, not a target.

Ids are `PREFIX-NN`, unique across all files, and never reused, even after a
rule is retired. *(lint)*

## Growing without overfitting

New rules come from walks. When a walk finds a problem no rule covers, the
report lists it under "Not covered by a rule". It becomes a candidate rule
when it can be worded without the product's nouns, and it is admitted when a
public source supports it or the same problem shows up in a second,
independent flow. One product's quirk stays a finding in that product's
report.

Taste is allowed, and it is the point: the rules choose between designs that
both work. But a taste rule still needs a basis, and data about real users
beats it. When observed user behaviour contradicts a rule, the rule changes.

## Disagreeing

- **For one flow:** add a `rule_overrides` entry to the flow file with the rule
  id and a reason (for example `DEC-01`, "expert users repeat this screen
  daily; one page with three answers tested faster"). The gate lists the
  override under accepted exceptions; it does not hide it.
- **For everyone:** open a pull request that changes, replaces or retires the
  rule, with evidence: a source, or walks of independent flows. "I don't like
  it" is not evidence; "these two flows failed the rule and were better for
  it" is.

## Retiring a rule

Retire a rule when a stronger source or user data contradicts it, when
independent projects keep overriding it for the same reason, or when another
rule covers it completely. Add `Retired: <version> — <reason>` (and
`Replaced by:` if one replaces it), keep the text, and add a CHANGELOG line.
The gate ignores retired rules and says so if a walk still reports them.

## Project rules

A project can keep its own rules in `.flowchad/rules/*.md` in the same format,
with its own prefix. The lint and the gate read them next to these. Project
rules may be specific to that product; they are not proposed upstream until
they pass the admission test.

## How this differs from a checklist

A generic checklist asks "is it usable?" and gets "mostly". These rules are
fewer, narrower and countable: each names what to look at on one screen, and
the walk records numbers (screens, decisions, words, viewport heights
scrolled) so the next walk can show whether a change made the path shorter.
They have severities that decide whether something may be handed to a human
tester, and they change only with evidence.
