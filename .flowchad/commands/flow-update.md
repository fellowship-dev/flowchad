---
description: Update an existing flow definition to reflect product changes
disable-model-invocation: false
---

Update the flow specified by $ARGUMENTS using the flow-update skill.

1. Parse $ARGUMENTS — first word is the flow name, rest is the description of what changed
2. If $ARGUMENTS is empty, list available flows and ask which one to update
3. Load the existing flow and scan for relevant code changes
4. Show the proposed diff to user for confirmation before saving
