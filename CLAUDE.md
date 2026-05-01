# Flowchad — Developer Guide

Flowchad is a **skills package** — AI-readable slash commands for automated UX QA. No source code to run, no build step, no test suite.

## Install / Distribute

```bash
npx skills add Fellowship-dev/flowchad --skill '*'
```

Installs all skills into the agent directory (`.claude/skills/`, `.cursor/skills/`, etc.).

## Repository Structure

```
.flowchad/skills/*/SKILL.md   # Skill implementations (the core product)
.flowchad/knowledge/          # Reference docs loaded by skills during execution
.flowchad/config.yml          # Config template — ships to user projects on install
.flowchad/templates/          # Example flow YAMLs users copy and customize
scripts/                      # Portable bash utilities called by skill specs
docs/                         # Agent reference documentation
specs/                        # Accepted feature specs
QUALITY_SCORE.md              # Per-skill quality grades and open issues
```

## The Nine Skills

| Command | What it does |
|---------|-------------|
| `/flowchad-setup` | Auto-discovers routes, tests, analytics — scaffolds config + flow definitions |
| `/flow-walk <name>` | Executes flow steps via Playwright CDP, captures screenshots + timing + video |
| `/flow-report <name>` | Classifies findings as Critical/Friction/Cosmetic, files GitHub issues |
| `/flow-add <description>` | Creates a new flow YAML from natural language |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |
| `/flow-suggest <name>` | Prioritized improvement plan ranked by effort vs impact |
| `/flow-diff <name>` | Compares walk snapshots across time to detect regressions |
| `/flow-diagram <name>` | Generates Mermaid flowchart from a flow definition |
| `/evidence-upload` | Uploads screenshots/GIFs to configured evidence backend |

## Key Rules

1. **Skill specs are the core product** — edit with care; they have subtle inter-skill dependencies.
2. **Never commit credentials** to `config.yml`; use `$ENV_VAR` references only.
3. **Scripts must be portable bash** — no bash 4+ features, no `greadlink`. Test on macOS + Linux.
4. **Open an issue before a large refactor** — skill specs have cross-skill dependencies.
5. **Update QUALITY_SCORE.md** when closing skill-related issues.

## Reference

- [Architecture](docs/architecture.md) — repo concepts: skill specs vs knowledge docs, config template, evidence branch
- [Workflows](docs/workflows.md) — how to edit skill specs, shell scripts, contributing rules
