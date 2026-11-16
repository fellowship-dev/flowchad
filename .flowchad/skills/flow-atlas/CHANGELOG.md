# Flow Atlas changes

## 2026-11-16 — Visual flows first

The atlas's primary output is a visual map of an app or website organized by
user goals: entries, connected screenshots, meaningful states, transitions,
branches, loops and outcomes. This replaces the initial audit-first framing
that required every action to receive a verdict, led with blockers and required
code-health counts. Findings are optional annotations; systematic QA remains
with flow-walk/flow-gate and code-health checks with their selected review.

Named builds, optional change comparisons, private evidence, capture gaps and
live-safety rules are preserved. New example manifests include flow and
transition links. Existing manifests containing screen path/order fields and
action labels remain readable; their missing branches are not inferred as fact.
No executable scripts, rules, dependencies or gate behavior changed.
