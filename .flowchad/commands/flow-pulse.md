---
description: Write or run the after-deploy pulse — one content-matched HTTP check per flow
disable-model-invocation: false
---

Run the flow-pulse skill with $ARGUMENTS (`init` or `run`; default `run`).

1. For `init`, write `.flowchad/pulse.tsv` with one check per flow, following the flow-pulse skill
2. For `run`, if `.flowchad/pulse.tsv` doesn't exist, suggest `/flow-pulse init`
3. Run the pulse script and print each failure with its timestamp and reason
