# Quality Score — fellowship-dev/flowchad

Last updated: 2026-05-21 (PR #39)

## Domains

| Domain | Grade | Last audit | Notes |
|--------|-------|------------|-------|
| flowchad-setup | B | 2026-05-21 | S1 ✅, S3 ✅ (docs 2026-05-01 > code 2026-05-21), S4 ✅ (3 open), S6 ❌ |
| flow-walk | C | 2026-05-21 | S1 ✅, S3 ✅, S4 ⚠️ (4 open), S6 ❌ |
| flow-report | C | 2026-05-21 | S1 ✅, S3 ✅, S4 ⚠️ (5 open), S6 ❌ |
| flow-add | C | 2026-05-21 | S1 ✅, S3 ✅, S4 ⚠️ (5 open), S6 ❌ |
| flow-suggest | B | 2026-05-21 | S1 ✅, S3 ✅, S4 ✅ (1 open), S6 ❌ |
| flow-diff | B | 2026-05-21 | S1 ✅, S3 ✅, S4 ✅ (3 open), S6 ❌ |
| flow-diagram | B | 2026-05-21 | S1 ✅, S3 ✅, S4 ✅ (2 open), S6 ❌ |
| flow-update | C | 2026-05-21 | S1 ✅, S3 ✅, S4 ⚠️ (4 open), S6 ❌ |
| evidence-upload | B | 2026-05-21 | S1 ✅, S3 ✅, S4 ✅ (0 open), S6 ❌ |

## Signal Matrix

| Domain | S1 Doc | S2 FlowChad | S3 Stale | S4 Issues | S5 Tests | S6 Hookshot |
|--------|--------|-------------|----------|-----------|----------|-------------|
| flowchad-setup | ✅ | N/A | ✅ (scripts 2026-05-21) | ✅ (3) | N/A | ❌ |
| flow-walk | ✅ | N/A | ✅ (docs>code) | ⚠️ (4) | N/A | ❌ |
| flow-report | ✅ | N/A | ✅ (docs>code) | ⚠️ (5) | N/A | ❌ |
| flow-add | ✅ | N/A | ✅ (docs>code) | ⚠️ (5) | N/A | ❌ |
| flow-suggest | ✅ | N/A | ✅ (docs>code) | ✅ (1) | N/A | ❌ |
| flow-diff | ✅ | N/A | ✅ (docs>code) | ✅ (3) | N/A | ❌ |
| flow-diagram | ✅ | N/A | ✅ (docs>code) | ✅ (2) | N/A | ❌ |
| flow-update | ✅ | N/A | ✅ (docs>code) | ⚠️ (4) | N/A | ❌ |
| evidence-upload | ✅ | N/A | ✅ (docs>code) | ✅ (0) | N/A | ❌ |

## Signal Applicability

| Signal | Applicable? | Reason |
|--------|------------|--------|
| S1 Doc Coverage | Yes | README.md covers all 9 domains with descriptions and quick-start |
| S2 FlowChad | No | Tool repo — no frontend framework; .flowchad/flows/ is empty by design (template) |
| S3 Staleness | Yes | README last updated 2026-05-01; scripts last commit 2026-05-21 (PR #39 — update mechanism) ✅ |
| S4 Open Issues | Yes | 6 total open issues across repo |
| S5 Tests | No | No test infrastructure detected |
| S6 Hookshot | Yes | Not configured ❌ |

## Grade Summary

- A: 0
- B: 5 (flowchad-setup, flow-suggest, flow-diff, flow-diagram, evidence-upload)
- C: 4 (flow-walk, flow-report, flow-add, flow-update)
- D: 0

**Methodology note (2026-05-18)**: S6 corrected from N/A to applicable per entropy-check spec. Previous A grades (flow-suggest, flow-diff, flow-diagram, evidence-upload) now B due to S6 ❌. C grades reflect S6 ❌ + S4 ⚠️ (4-5 open issues). S3 ✅ across all domains — README updated 2026-05-01 is ahead of scripts (2026-04-17).

## Dispatched This Run

- **#20 — Update mechanism + drift detection for drop-in installs** (P1) — PR #39 in double-check review (6/7 items done; "Register on skills.sh registry" remains open)

## History

| Date | Trigger | Summary |
|------|---------|---------|
| 2026-04-24 | weekly sweep | 9 domains; setup B, walk B, report B, add B, suggest A, diff A, diagram A, update B, upload A. S6 incorrectly excluded. |
| 2026-05-18 | weekly sweep | S6 methodology corrected. 5 B-grades, 4 C-grades. 0 real regressions (all changes are S6 correction + updated issue counts). |
| 2026-05-19 | daily sweep | 9 domains, 0 regressions, 0 improvements. All signals stable. |
| 2026-05-21 | daily sweep | 9 domains, 0 regressions, 0 improvements. Dispatched #20 (P1, update mechanism). |
| 2026-05-21 | PR #39 double-check | Updated S3 staleness for flowchad-setup (scripts updated). #20 6/7 items in PR; "Register on skills.sh registry" remains open. |
