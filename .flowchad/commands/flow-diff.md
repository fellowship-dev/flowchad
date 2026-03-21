---
description: Compare walk snapshots to detect regressions and improvements over time
disable-model-invocation: false
---

Compare snapshots for the flow specified by $ARGUMENTS using the flow-diff skill.

1. Find all snapshots for the flow in `.flowchad/snapshots/`
2. If fewer than 2 snapshots exist, suggest walking again after changes
3. Compare step-by-step: status, timing, visual differences
4. Print diff report with regressions, improvements, and trends
