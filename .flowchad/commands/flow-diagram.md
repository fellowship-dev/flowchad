---
description: Generate mermaid flowcharts from flow definitions — visualize steps, branches, and timing
disable-model-invocation: false
---

Generate a mermaid diagram for the flow specified by $ARGUMENTS using the flow-diagram skill.

1. Load flow definition from `.flowchad/flows/$ARGUMENTS.yml` (or all flows if `all`)
2. If the flow has been walked, overlay timing and status colors
3. Print the mermaid source in a fenced code block
4. If `all`, also generate a multi-flow overview diagram
