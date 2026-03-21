---
description: Generate a friction report from walk results — Critical/Friction/Cosmetic with actionable fixes
disable-model-invocation: false
---

Generate a friction report for the flow specified by $ARGUMENTS using the flow-report skill.

1. Find the most recent snapshot for the flow in `.flowchad/snapshots/`
2. If no snapshot exists, suggest running `/flow-walk $ARGUMENTS` first
3. Analyze results and screenshots following the flow-report skill instructions
4. Save report to `.flowchad/reports/`
5. Print the full report
