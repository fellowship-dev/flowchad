# Workflows

## Editing Skill Specs

Skill specs (`.flowchad/skills/*/SKILL.md`) are the core product. They have subtle inter-skill dependencies — read carefully before editing.

### Rules

1. **Algorithm changes** — update both the SKILL.md narrative and any code snippets together. The AI reads both; contradictions cause broken behavior.

2. **New output fields** — if you add fields to `results.json` in `flow-walk/SKILL.md`, also update all downstream skills that read results: `flow-report`, `flow-diff`, `flow-suggest`.

3. **Config additions** — add new fields to `.flowchad/config.yml` as commented-out examples with inline documentation. Never use real values.

4. **Knowledge changes** — if the friction taxonomy or flow schema changes, update the relevant knowledge file *and* check that the affected skill specs reference the correct file path.

## Editing Rules

Rules live in `.flowchad/skills/flow-walk/rules/` and follow the format and admission test in its README. A change adds or edits the rule, adds a CHANGELOG line naming its id, and passes `bash .flowchad/skills/flow-walk/scripts/lint_rules.sh`. Reversing or narrowing a rule replaces it (`Replaces:`) and retires the old one; ids are never reused. Keep client and product names out of the public repo: run the lint with `FLOWCHAD_FORBIDDEN_TERMS=<private list>` before pushing.

New results.json fields used by the gate (`steps[].measures`, `rule_results`, `rule_overrides`, `value_moment`, `kind`) must stay optional for older snapshots: the gate reports their blockers as not judged rather than passing them.

## Editing Shell Scripts

Scripts in `scripts/` are called by skill specs. Requirements:

- **Portable bash only** — no bash 4+ features (no associative arrays, no `${arr[-1]}`), no `greadlink`
- **Test on both macOS and Linux** before merging: `bash tests/pulse_test.sh` covers `pulse.sh`; `bash tests/upload_gate_test.sh` covers the evidence publishing gate; `bash tests/rules_lint_test.sh` covers the rule admission lint; `bash tests/changed_test.sh` covers `flow-gate/scripts/changed.sh` in a scratch git repo; `node tests/gate_test.mjs` and `node tests/flowmap_test.mjs` (Node built-ins only) cover the gate and the flow-map measures; `node tests/guard_test.mjs` and `node tests/measure_test.mjs` (need Playwright and Chromium) cover the flow-walk write guard against servers that count what arrives, and the in-page measures

Scripts that ship with a skill (`.flowchad/skills/*/scripts/`) follow the same rules; they are what `npx skills add` installs, while root `scripts/` only reaches users through `update.sh`.

## Contributing

- **Open an issue before a large refactor** — skill specs have subtle cross-skill dependencies. Getting alignment first prevents wasted work.
- **Update `QUALITY_SCORE.md`** when closing skill-related issues — it tracks per-skill health and open issue tracking.
- **Reference accepted specs** — the `specs/` directory contains accepted feature specs; reference them in PRs that implement them.

## Releasing / Distributing

There is no build step. Users install the latest version directly from GitHub:

```bash
npx skills add Fellowship-dev/flowchad --skill '*'
```

To update an existing install:

```bash
npx skills remove flow-walk flow-report flow-add flow-update flow-suggest flow-diff flow-diagram flow-reproduce flow-pulse flow-gate flow-atlas flowchad-setup evidence-upload -y
npx skills add Fellowship-dev/flowchad --skill '*'
```

Note: `npx skills update` has a [known bug](https://github.com/vercel-labs/skills/issues/337) where project-scoped installs are not tracked in the global lock file, so updates are not detected.
