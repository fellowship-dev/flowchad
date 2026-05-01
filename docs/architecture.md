# Architecture

## What Kind of Repo This Is

Flowchad is a **skills package**, not an application. There is no source code to compile or run, no build step, and no test suite. The product is a set of AI-readable SKILL.md files that agents execute when users invoke slash commands.

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

## Config Template vs User Config

The `.flowchad/config.yml` in this repo is a **template** — it ships to the user's project when they run the installer. In a user's project, they fill in their actual URL, type, and credentials.

**Critical constraint:** Never commit real values into the template. All sensitive values must use `$ENV_VAR` references. The template is public and committed to this repo.

## Evidence Branch

The git evidence backend stores screenshots and GIFs in a dedicated orphan branch (default name: `evidence`). An orphan branch has no shared history with `main` — it is a completely separate tree used purely for binary artifacts. This keeps binaries out of the main git history while keeping URLs publicly accessible via GitHub's raw content endpoint.

Initialize with:
```bash
./scripts/evidence-init.sh        # auto-detects repo from git remote origin
./scripts/evidence-init.sh org/repo   # explicit repo
```

The script is idempotent: if the evidence branch already exists, it exits cleanly.

## Dependency Graph Between Skills

Skills share data via `results.json` written by `/flow-walk`. Downstream skills that read this file:

- `/flow-report` — reads findings to classify and file issues
- `/flow-diff` — reads snapshots to compare across runs
- `/flow-suggest` — reads findings to prioritize improvements

If `results.json` schema changes (new fields added), all three downstream skills must be updated.
