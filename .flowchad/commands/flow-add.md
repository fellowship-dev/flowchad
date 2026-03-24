---
description: Create a new flow definition from a natural language description of a feature or user journey
disable-model-invocation: false
---

Create a new flow definition from the description in $ARGUMENTS using the flow-add skill.

1. Parse $ARGUMENTS as a natural language description of the flow to create
2. If $ARGUMENTS is empty, ask what flow to create
3. Scan the codebase and existing flows following the flow-add skill instructions
4. Draft the flow YAML and present to user for confirmation
5. Save to `.flowchad/flows/` with a descriptive filename
