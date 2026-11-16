---
description: Make a visual map of an app or website, organized by flows, screenshots, branches and outcomes
disable-model-invocation: false
---

Build an atlas with the flow-atlas skill for $ARGUMENTS (`--after <change>` optionally adds changed flows; `+` joins changes mapped as one build).

1. Discover the user flows in scope, their goals, entry points, roles, meaningful states, branches and outcomes
2. Identify the build and environment; use local copies and stand-ins under the live-safety rules, naming every capture gap
3. Navigate each flow, capture its screen states and connect observed transitions; preserve shared screens and cross-flow links
4. Write `.flowchad/atlas/<date>/` with a visual flow index, linked screenshot journeys, manifests and coverage gaps; check navigation and responsive readability
5. Link the page first; keep incidental findings optional and use flow-walk/flow-gate for systematic QA
