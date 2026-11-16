---
name: flowchad
description: Drop-in AI QA for any web project — opinionated flow walks judged against rules with sources, measures to value, and a gate before human testing
version: "0.5.0"
repository: https://github.com/Fellowship-dev/flowchad
install: "curl -fsSL https://raw.githubusercontent.com/Fellowship-dev/flowchad/main/install.sh | bash"
skills:
  - flowchad-setup
  - flow-walk
  - flow-add
  - flow-update
  - flow-suggest
  - flow-diff
  - flow-diagram
  - flow-report
  - flow-reproduce
  - flow-pulse
  - flow-gate
  - flow-atlas
  - evidence-upload
---

# Flowchad

Drop-in AI QA for any web project. Define flows, walk them with Playwright, capture screenshots, and detect regressions — all from Claude Code.

## Install

```bash
# Scaffold project data directory
curl -fsSL https://raw.githubusercontent.com/Fellowship-dev/flowchad/main/install.sh | bash

# Install skills
npx skills add Fellowship-dev/flowchad --skill '*'
```

## Skills

| Command | What it does |
|---------|-------------|
| `/flowchad-setup` | Auto-discovers routes, tests, analytics — scaffolds config + flow definitions |
| `/flow-walk <name>` | Executes flow steps via Playwright CDP, captures screenshots + timing |
| `/flow-report <name>` | Reach-goal table per flow, findings ranked launch blocker / should fix / later, files GitHub issues |
| `/flow-add <description>` | Creates a new flow YAML from natural language |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |
| `/flow-suggest <name>` | Prioritized improvement plan ranked by effort vs impact |
| `/flow-diff <name>` | Compares walk snapshots across time to detect regressions |
| `/flow-diagram <name>` | Generates Mermaid flowchart from a flow definition |
| `/flow-reproduce <issue-ref>` | Reproduces a customer-reported bug in-browser, attaches evidence to the GitHub issue |
| `/flow-pulse [init\|run]` | Seconds-long after-deploy check of each flow's key step, matched on content |
| `/flow-gate <name\|all> [--changed]` | PASS / FAIL / INCOMPLETE before a human tests: blockers, measures against the last walk, rough edges, changed flows |
| `/flow-atlas [--after <change>]` | Every screen and action walked for real, one label each, blockers in walking order, code health measured, today versus after open changes |
| `/evidence-upload` | Uploads reviewed screenshots/GIFs to the public evidence S3 bucket (opt-in) |

Walks are safe on live systems by default (`flow-walk/references/live-safety.md`), apply the checks in `flow-walk/references/walk-checks.md`, record the measures in `flow-walk/references/measures.md`, and are judged against the rules in `flow-walk/rules/` (each with a source; see its README for the admission test). A Claude Code subagent definition lives in `agents/flowchad.md`.

## Update

```bash
bash scripts/check-updates.sh   # check for updates
bash scripts/update.sh          # apply update (preserves your flows, config, snapshots)
```
