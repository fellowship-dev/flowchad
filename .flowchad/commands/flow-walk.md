---
description: Walk a user flow — execute steps via Playwright, capture screenshots, measure timing
disable-model-invocation: false
---

Walk the flow specified by $ARGUMENTS using the flow-walk skill.

1. Load the flow definition from `.flowchad/flows/$ARGUMENTS.yml`
2. If the file doesn't exist, list available flows and ask which one to walk
3. Execute the walk following the flow-walk skill instructions
4. Store results in `.flowchad/snapshots/`
5. Print the summary
