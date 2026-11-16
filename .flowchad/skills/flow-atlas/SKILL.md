---
name: flow-atlas
description: Make a visual map of an app or website, organized by user flows, with screenshots, entry points, transitions, branches and outcomes. Usage /flow-atlas [--after <ref>...]
user_invocable: true
---

# Flow Atlas

An atlas is a visual map of an app or website, organized by user flows. It
answers: where can someone start, which screens and states do they encounter,
what choices lead elsewhere, and where does each path end? It is useful for
understanding, discussing and reviewing a product even when everything works.

Map what exists on a named build. Keep proposed designs separate. Bugs and
confusing behavior may surface while mapping; they are optional annotations,
not the atlas's purpose or its organizing structure. `/flow-walk` and
`/flow-gate` own systematic UX checks and acceptance. An atlas is not a pass
for either, and it does not require a code-health audit.

## Usage

```
/flow-atlas                                   # map the deployed build
/flow-atlas --after 412                       # also map the changed flows
/flow-atlas --after 412+415 --after 418       # one integrated build, one separate build
```

A `--after` value is a pull request number, branch or `+`-joined set mapped as
one build. Compare only the affected flows and say which. Conflicting changes
are separate builds; identify the conflict rather than implying integration.

## Safety and evidence

Follow `flow-walk/references/live-safety.md`: surface modes, write guard,
private evidence and cleanup still apply. The default is a **`local-copy`**
of a named commit with production-equivalent settings (names and non-secret
values only) and stand-ins for external services: captured mail, test payments,
fake DNS and identity providers. Production is **`read-only-live`**: at most
unauthenticated GETs of public pages for comparison. Never send real mail, pay,
write real DNS or use production credentials under the atlas's default scope.

Record target, mode, role, settings and stand-ins per build. Call a local copy
of the deployed revision exactly that, not a live test. A provider boundary
that cannot be traversed safely stays visible as **not captured**, with why.
When a local copy is unavailable, map reachable public pages in read-only-live
mode and state the unavailable roles or provider boundaries.
Screenshots contain observed UI; inferred transitions are labelled inferred.
A rendered screen alone does not prove its actions work.

Keep output private by default (screens may show signed-in data):

```bash
mkdir -p .flowchad
touch .flowchad/.gitignore
grep -qxF "atlas/" .flowchad/.gitignore || echo "atlas/" >> .flowchad/.gitignore
```

## Method

### 1. Discover the flows

Use existing flow definitions, routes, navigation and the rendered product.
Read code where available to uncover hidden routes, role gates and state
variants; code access is not a prerequisite for mapping a website. State the
requested scope: the whole app/site unless a particular area was selected.

Organize around user goals, not a universal list of product modules. For each
flow record:

- a stable ID, human title and the person's goal;
- entry points, participating roles and starting conditions;
- the ordered screens and meaningful states;
- transitions: action or condition, destination, branches, back/retry paths
  and cross-links to other flows;
- success, cancellation, external handoff or other end states.

Capture meaningful empty, loading, error and permission states where they
change the route or explain the experience. Reuse a screen ID when flows share
one screen; show each relevant context instead of duplicating its screenshot.
List discovered flows or branches not captured, with the reason. An inventory
of URLs alone is not a flow map.

### 2. Prepare the named build

Record commit or identifiable version, URL/instance, environment and capture
date. For a local copy, record differences from the deployed configuration.
Use realistic made-up data and reserved domains (`example.com`, `*.test`).
Seed through normal routes where possible; disclose direct database seeding
when a route cannot complete locally. Only create roles or organizations the
flow needs. Independent builds may be mapped in parallel on isolated machines.

### 3. Capture and connect

Navigate each flow far enough to capture its screens, meaningful branches and
outcomes. Follow the actions needed to establish transitions, respecting the
safety boundary. This does not require exercising every control, running jobs,
or triggering messages unrelated to the mapped journey.

For each screen/state:

1. Give it a stable ID, title, route, role, state and flow membership.
2. Capture a legible screenshot. Default: 375 px wide; add 1440 px for dense
   layouts or material responsive differences. Use JPEG, roughly quality 70,
   under 400 KB per image where practical; include a tall screen as multiple
   segments rather than cutting off its continuation. Keep captures comparable.
3. Record outgoing transitions and conditions, linking to destination screen
   or flow IDs. Label external handoffs and exits explicitly. Show loops such
   as retry or back navigation rather than implying a single straight path.
4. Include an email, notification or external page when it is a step in that
   journey, with its trigger and whether it was captured or simulated.

Save `manifests/<build>.json` incrementally so partial mapping remains usable.
See `templates/manifest.example.json`. New manifests describe `flows` and screen
`transitions`; older manifests with only `screens[].path` and `order` remain
usable as ordered screenshot groups. Preserve their IDs, evidence and optional
labels; identify missing branch information instead of inventing it.

### 4. Assemble a visual page

Write `.flowchad/atlas/<date>/index.html`, manifests and `shots/`. Use the
section order in `templates/page-outline.md`: a flow index first, then one
section per flow with its goal, entry, connected screenshot sequence, branches
and outcomes. Give flows and screens anchor links so feedback can name an
exact place. Navigation should work without requiring the reader to learn the
manifest format.

A compact diagram or linked screen map may introduce a branching flow; the
screenshots remain its visual detail. Show roles and alternate states beside
the relevant screen. Build comparisons belong next to the flow they change.
End with capture gaps and environment differences. Derive any coverage counts
from manifests and state their denominator; counts are navigation aids, not a
quality score.

Check the page at 375 and 1440 px: images load, text is legible, flow navigation
and screen links work, branches/outcomes are followable and the page fits
without accidental horizontal overflow. Intentional screenshot strips need
an obvious scroll affordance. Record what was not checked.

### 5. Optional findings and deeper checks

Record useful observations against screen/transition IDs, with evidence and a
clear distinction between observation and proposed change. An atlas with no
findings is still complete if its agreed map coverage is complete. Use
`templates/findings.md` only when findings exist.

Existing action labels may be retained: Works, Untrue text, Broken, Dead end,
Hidden, Not built, Needs live test. Attach a label only when the evidence
supports it; untested actions do not become Works. A capability requiring a
real provider stays Needs live test. For systematic action/rule checks use
`/flow-walk` and `/flow-gate`; link their evidence without presenting atlas
coverage as acceptance. Code health, job audits, fix sizing and issue ownership
belong to their selected review/workflow and may be linked when requested.

When a previous atlas exists, show changed flows/screens/branches and relevant
capture gaps. Compare like builds, roles and scope. Label-count changes alone
do not establish an improvement or a regression.

## Output

Link the visual page first. Briefly state the named build/environment, flows
mapped, coverage gaps and any comparison included. Point to optional findings
separately. The reader should be able to choose a flow, follow it visually,
and attach feedback to a screen without first reading a bug report.
