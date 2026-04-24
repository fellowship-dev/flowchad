# Quality Score — fellowship-dev/flowchad

Last updated: 2026-04-24

## Domains

| Domain | Grade | Last audit | Notes |
|--------|-------|------------|-------|
| flowchad-setup | B | 2026-04-24 | S4 yellow: 4 open issues (>3 threshold); code 3d ahead of docs |
| flow-walk | B | 2026-04-24 | S4 yellow: 5 open issues (>3 threshold); code 3d ahead of docs |
| flow-report | B | 2026-04-24 | S4 yellow: 5 open issues (>3 threshold); code 3d ahead of docs |
| flow-add | B | 2026-04-24 | S4 yellow: 6 open issues (>3 threshold); code 3d ahead of docs |
| flow-suggest | A | 2026-04-24 | All signals green; 1 open issue; docs current |
| flow-diff | A | 2026-04-24 | All signals green; 3 open issues (at threshold); docs current |
| flow-diagram | A | 2026-04-24 | All signals green; 2 open issues; docs current |
| flow-update | B | 2026-04-24 | S4 yellow: 5 open issues (>3 threshold); docs current |
| evidence-upload | A | 2026-04-24 | All signals green; 0 open issues; docs current |

## Signal Applicability

| Signal | Applicable? | Reason |
|--------|------------|--------|
| S1 Doc Coverage | Yes | README.md covers all 9 domains with descriptions and quick-start |
| S2 FlowChad | No | Tool repo — no frontend framework; .flowchad/flows/ is empty by design (template) |
| S3 Staleness | Yes | — |
| S4 Open Issues | Yes | — |
| S5 Tests | No | No test infrastructure detected |
| S6 Hookshot | No | .claude/doc-coverage.json not configured |
| S7 Speckit Drift | No | Speckit not installed |

## Grade Summary

- A: 4 (flow-suggest, flow-diff, flow-diagram, evidence-upload)
- B: 5 (flowchad-setup, flow-walk, flow-report, flow-add, flow-update)
- C: 0
- D: 0
- F: 0

## History

| Date | Trigger | Summary |
|------|---------|---------|
| 2026-04-21 | tooling.dev daily sweep | 9 domains scanned, 0 regressions, 0 improvements — first sweep |
| 2026-04-24 | tooling.cto entropy sweep | 9 domains scanned, 5 regressions (A→B), 0 improvements — open issue accumulation on core skills (flowchad-setup, flow-walk, flow-report, flow-add, flow-update) |
