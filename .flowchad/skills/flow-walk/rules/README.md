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
- **Basis:** source — Author, *Title* (year), <https://…> (checked YYYY-MM-DD): what it says that supports the rule, quoted where possible.
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-0001, FN-0002).
- **Threshold source:** <https://…> (checked YYYY-MM-DD): where the number comes from (required when the Rule, Check or Threshold has a number), or `tool standard: <reason> <https://…> (checked YYYY-MM-DD)`.
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

**Threshold source** names which cited source a number comes from. Any digit
in the Rule or Check sentence, and any `Threshold`, needs one; its link must be
one of the rule's `source` bases, and it says in a few words what the source
gives. When the number is FlowChad's own and a source only motivates it
(FOLD-01's zero scroll, ERR-01's zero dead ends, DOCS-01's zero unanswered
questions), the line starts `tool standard:`, says the number is FlowChad's
own standard, and cites the source that motivates it. The lint checks that the
line exists, carries a claim and a valid check date, and points at a cited
source; the reviewer checks the number.

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
   author has never seen. *(lint: every text file in the folder, including
   group intro prose, Basis claims, README and CHANGELOG, against the vendor
   and brand names in `forbidden-terms.txt` plus any private list you pass in
   `FLOWCHAD_FORBIDDEN_TERMS`; both sides are normalised, so `Acme-Corp`,
   `Acme Corp` and `AcmeCorps` all match `acmecorp`. Only the cited work's
   author and title in a source Basis line, and links, are exempt.)*
2. **Checkable.** The rule is one sentence, and the check says what to look at
   or count and what a fail looks like. "Feels cluttered" is not a check;
   "a badge, banner or widget visible on the step that the step does not need"
   is. *(lint: one sentence, at most 45 words, check present)*
3. **Based.** At least one `source` basis naming a public source with a link
   and the date it was opened and checked, or a `field` basis showing the rule
   failed in **at least two flows**. Two flows count as independent when
   they serve different user goals, not when they are two screens of one
   flow; they may belong to the same product. Field notes name no person,
   client or product: they say how many flows and products, "maintainer field
   note" with the month, and one field-note id per observation (`FN-0001`, a
   plain sequence number). *(lint: a link, a claim of a few words and a real
   `(checked YYYY-MM-DD)` date, not in the future and not before 2020, on every
   source; ids of the form `FN-NNNN`, never `FN-0000`; at least one id on every
   field basis and as many distinct ids as flows counted)*
   Each field note has an id. The observation behind it (what was walked,
   when, and what the person had to do or could not see) is recorded
   privately by the maintainer and is not published, because it names the
   products walked. A rule that rests only on field notes says so: it has no
   `source` basis, and the README and CHANGELOG list it as resting on field
   notes alone. The lint cannot see those records, so it cannot tell whether
   two flows were independent; that is the reviewer's judgement, and a reader
   who cannot see the records should weigh a field-only rule accordingly.
   Anyone proposing a rule from their own observation supplies their own
   note: a short description in the pull request of each flow where the
   problem happened (the kind of product, the step, what the person had to do
   or could not see, the date), which the maintainer records and assigns an
   id. The reviewer also opens every source link and checks that it says
   what the line claims; a book whose claim cannot be read online is not
   enough on its own.
4. **No silent contradiction.** A rule that reverses, narrows or widens an
   existing rule replaces it: the new rule says `Replaces: ID`, the old one is
   retired in the same change. *(lint: a replaced rule must be retired)* The
   reviewer reads the group for conflicts.
5. **Severity set.** *(lint)*
6. **Examples.** One passing and one failing example, product-neutral
   (`example.com`, "a setup wizard", "a billing page"). *(lint)*
7. **Provenance.** `Since:` and a line in [CHANGELOG.md](CHANGELOG.md) naming
   the rule id. *(lint)*
8. **Numbers only where a source sets or motivates them.** A rule with a
   `Threshold`, or a number in its Rule or Check sentence ("within 3
   seconds"), has a `source` basis and a `Threshold source` line pointing at
   it; field notes do not set numbers. A number may be FlowChad's own stated
   standard only when the rule says so explicitly (`Threshold source: tool
   standard: <reason>`) and cites the source whose evidence motivates it.
   *(lint)* Everything else is measured against the previous walk, not a
   target.

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
  daily; one page with three answers tested faster"). The gate lists every
  override under known rough edges; it does not hide it. Overriding a
  `blocker` also needs `by:` and `date:` and a reason of at least four words,
  and the gate then says PASS-WITH-OVERRIDES. PATH-01 cannot be overridden.
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
