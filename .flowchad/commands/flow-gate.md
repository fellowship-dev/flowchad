---
description: Gate a walked flow before a human tests it — blockers, measures against the previous walk, rough edges, changed flows
disable-model-invocation: false
---

Run the gate for $ARGUMENTS using the flow-gate skill.

1. With `--changed`, list the flows the current change touches (`scripts/changed.sh`) and walk the ones marked `walk` first
2. Run `scripts/gate.mjs` on the latest walk of each flow, with the previous walk and the tester's address (`--target`, or `gate.target` in config.yml; without one the gate says INCOMPLETE)
3. Write the walk record to `.flowchad/walks/` with `--record`
4. Print PASS, PASS-WITH-OVERRIDES, FAIL or INCOMPLETE with the reasons and the known rough edges (overrides first); on FAIL or INCOMPLETE, say not to hand it to a tester yet; on PASS-WITH-OVERRIDES, name every override in the hand-off
