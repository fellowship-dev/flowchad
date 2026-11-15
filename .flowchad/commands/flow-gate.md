---
description: Gate a walked flow before a human tests it — blockers, measures against the previous walk, rough edges, changed flows
disable-model-invocation: false
---

Run the gate for $ARGUMENTS using the flow-gate skill.

1. With `--changed`, list the flows the current change touches (`scripts/changed.sh`) and walk the ones marked `walk` first
2. Run `scripts/gate.mjs` on the latest walk of each flow, with the previous walk and `--target` when the tester's address is known
3. Write the walk record to `.flowchad/walks/` with `--record`
4. Print PASS, FAIL or INCOMPLETE with the reasons and the known rough edges; on anything but PASS, say not to hand it to a tester yet
