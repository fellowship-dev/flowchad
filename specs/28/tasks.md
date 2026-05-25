# Tasks: flow-reproduce skill (issue #28)

## Task 1 — Create `.flowchad/skills/flow-reproduce/SKILL.md`

Primary deliverable. Full skill spec covering all five phases:
- Phase 1: Parse issue context (gh issue view, extract error/URL/action/auth)
- Phase 2: Infer reproduction flow YAML and save to `.flowchad/flows/`
- Phase 3: Walk flow using Playwright CDP (reuse flow-walk model)
- Phase 4: Determine outcome (reproduced vs could-not-reproduce)
- Phase 5: Upload evidence + update GitHub issue (label + comment)

Acceptance: skill is self-contained, covers all phases, handles graceful degradation.

## Task 2 — Create `.flowchad/commands/flow-reproduce.md`

Thin command wrapper. Usage line, link to skill, example invocations.
Mirrors the pattern in `.flowchad/commands/flow-walk.md`.

## Task 3 — Update `QUALITY_SCORE.md`

Add `flow-reproduce` domain row to the Domains table and Signal Matrix.
Update "History" entry for today (2026-05-25).
Update grade summary counts.

## Task 4 — Update `SKILL.md` (repo root README)

Add `/flow-reproduce` row to the skills table (The Nine Skills → The Ten Skills section).
Update the skill count from nine to ten in text references.
