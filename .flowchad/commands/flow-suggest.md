---
description: AI-powered improvement prioritization — ranked action plan from walk results and friction reports
disable-model-invocation: false
---

Generate prioritized improvement suggestions for the flow specified by $ARGUMENTS using the flow-suggest skill.

1. Gather all available data: walk results, reports, diffs, screenshots
2. If no walk exists, suggest running `/flow-walk $ARGUMENTS` first
3. Analyze and rank by effort vs impact matrix
4. Print the improvement plan
5. If `all`, include cross-flow analysis
