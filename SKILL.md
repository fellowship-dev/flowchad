---
name: flowchad
description: Drop-in AI QA for any web project — automated flow walking, screenshot capture, and regression detection
version: "0.2.0"
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
| `/flow-report <name>` | Classifies findings as Critical/Friction/Cosmetic, files GitHub issues |
| `/flow-add <description>` | Creates a new flow YAML from natural language |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |
| `/flow-suggest <name>` | Prioritized improvement plan ranked by effort vs impact |
| `/flow-diff <name>` | Compares walk snapshots across time to detect regressions |
| `/flow-diagram <name>` | Generates Mermaid flowchart from a flow definition |
| `/flow-reproduce <issue-ref>` | Reproduces a customer-reported bug in-browser, attaches evidence to the GitHub issue |
| `/evidence-upload` | Uploads screenshots/GIFs to configured evidence backend |

## Update

```bash
bash scripts/check-updates.sh   # check for updates
bash scripts/update.sh          # apply update (preserves your flows, config, snapshots)
```
