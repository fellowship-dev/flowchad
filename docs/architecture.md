# Architecture

## What Kind of Repo This Is

Flowchad is a **skills package**, not an application. There is no source code to compile or run and no build step; the few shipped scripts have tests in `tests/`. The product is a set of AI-readable SKILL.md files that agents execute when users invoke slash commands.

Skills are installed into user projects via `npx skills add` and live in the agent's skill directory (`.claude/skills/`, `.cursor/skills/`, etc.). The flowchad repo is the upstream source for those files.

## Two Types of Flowchad Documents

### Skill Specs (`.flowchad/skills/*/SKILL.md`)

Executable instructions for the AI. Each SKILL.md tells the agent *how* to perform a command — step-by-step procedures, shell commands, JavaScript snippets. When a user invokes `/flow-walk`, the agent follows the instructions in `.flowchad/skills/flow-walk/SKILL.md`.

### Knowledge Docs (`.flowchad/knowledge/`)

Reference material the AI reads *during* skill execution. The friction taxonomy, flow schema, and platform evaluation criteria are loaded on demand by individual skills — they are not instructions, they are lookup tables.

| File | Purpose |
|------|---------|
| `flow-anatomy.md` | How to decompose products into testable flows |
| `flow-schema.md` | Full YAML schema reference for flow definitions |
| `friction-taxonomy.md` | Critical/Friction/Cosmetic classification decision tree |
| `goal-setting.md` | Business→Product→Flow goal hierarchy |
| `metrics-primer.md` | Latency, error rate, visual consistency guidance |
| `platform-types.md` | Evaluation criteria per platform type (saas/website/mobile/internal) |

### Skill References (`.flowchad/skills/flow-walk/references/`)

`npx skills add` installs each skill's folder and nothing outside it (see the skills CLI README: the lock hash covers "every file in the skill folder"). `.flowchad/knowledge/` therefore reaches users only through `scripts/update.sh`. The rules every walk must follow live inside the flow-walk skill so the documented install carries them; other skills refer to them as `flow-walk/references/…`.

| File | Purpose |
|------|---------|
| `live-safety.md` | Surface modes, per-host write guard, secrets, private evidence, bot checks, clean-up — the default contract for every walk |
| `walk-checks.md` | Rendered content over status codes, timestamps, same-session widths, effort counts, truth cross-checks, dead ends, per-step errors |

| `measures.md` | The numbers every walk records per step and per flow, and how the gate computes flow totals |
| `flow-maps.md` | Mermaid flow-map conventions and judging a map before anything is built |

The older knowledge docs above have the same distribution gap; moving them is a separate change.

### Rules (`.flowchad/skills/flow-walk/rules/`)

The opinionated part: one file per concern, each rule with an id, a checkable sentence, how to check it, a severity, its basis (a linked source or failures in two independent flows), examples, and provenance. The README holds the format and the admission test; `CHANGELOG.md` names every rule id; `forbidden-terms.txt` keeps vendor names out. They sit in the flow-walk skill for the same reason as the references: they are judged on every walk and must reach users through `npx skills add`. `flow-walk/scripts/lint_rules.sh` enforces the mechanical criteria. Projects add their own in `.flowchad/rules/`.

### The gate (`.flowchad/skills/flow-gate/`)

`scripts/gate.mjs` combines the walker's `rule_results` with thresholds applied to the measures and decides PASS, PASS-WITH-OVERRIDES, FAIL or INCOMPLETE (reading `gate.target` and deploy checks from `.flowchad/config.yml`); `--record` writes the committed walk record to `.flowchad/walks/`. `scripts/changed.sh` maps a diff to the saved flows it touches, from each flow's `covers:` globs and its last walk record's commit. Both read the rules from `../flow-walk/rules`, so installing one skill without the other is not supported.

### The atlas (`.flowchad/skills/flow-atlas/`)

A visual map of an app or website organized by user goal: flow entries,
connected screen/state screenshots, transitions, branches and outcomes. It
reuses flow-walk's live-safety contract and records named builds and capture
gaps, but systematic action/rule testing remains in flow-walk/flow-gate.
Findings and deeper audits are optional supporting evidence. `templates/` holds
an example manifest, optional observations and the visual page outline. New
manifests add flows/transitions; older path/order screen groups and action
labels remain readable without inventing missing transitions. Output goes to
`.flowchad/atlas/<date>/`, ignored by git because screens can show signed-in data.

### Agent Definition (`agents/flowchad.md`)

A Claude Code subagent that carries the same defaults in short behavioural prose, for use with or without the skills installed. It is the source of truth; installs are copies (see README → Agent definition).

## Config Template vs User Config

The `.flowchad/config.yml` in this repo is a **template** — it ships to the user's project when they run the installer. In a user's project, they fill in their actual URL, type, and credentials.

**Critical constraint:** Never commit real values into the template. All sensitive values must use `$ENV_VAR` references. The template is public and committed to this repo.

## Evidence Hosting

Evidence stays local by default (`evidence.backend: none`). When publishing is asked for, evidence (screenshots, GIFs, videos) is uploaded by the `evidence-upload` skill directly to a public S3 bucket with content-addressed keys (`<owner>/<repo>/<prefix>/<sha16>-<name>`), using only the `EVIDENCE_*` environment secret. Bucket URLs render in private-repo issues and PRs, unlike repo-relative or `raw.githubusercontent.com` links. The upload script is `.flowchad/skills/evidence-upload/scripts/upload_evidence.sh`; the legacy orphan-branch scripts have been removed.

## Dependency Graph Between Skills

Skills share data via `results.json` written by `/flow-walk`. Downstream skills that read this file:

- `/flow-report` — reads findings to classify and file issues
- `/flow-diff` — reads snapshots to compare across runs
- `/flow-suggest` — reads findings to prioritize improvements

Since 0.4.0 `results.json` also carries `goal`, `goal_reached`, `stopped_at`, `surface`, `counts`, `dead_ends`, `environment_checks`, `residual_risk`, and per step `observed_at`, `words`, per-width `screenshots`, `console_errors`, `failed_requests`, `blocked_writes` and `truth_checks`. Downstream skills treat these as optional so older snapshots still load.

Since 0.5.0 it also carries `kind`, `value_moment`, `steps[].screen`, `steps[].measures`, `rule_results`, `rule_overrides` and `not_covered`, read by `/flow-gate` (and through it `/flow-report` and `/flow-diff`).

`/flow-pulse` reads `.flowchad/pulse.tsv`, keyed by the same flow ids.

If `results.json` schema changes (new fields added), all three downstream skills must be updated.
