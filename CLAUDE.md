# Flowchad — Developer Guide

Flowchad is a **skills package** — AI-readable slash commands for automated UX QA. No build step. The few shipped scripts have tests in `tests/` (`bash tests/pulse_test.sh`; `bash tests/upload_gate_test.sh`; `bash tests/rules_lint_test.sh`; `bash tests/changed_test.sh`; `node tests/gate_test.mjs`; `node tests/flowmap_test.mjs`; `PLAYWRIGHT_DIR=<dir with playwright> node tests/guard_test.mjs` and `tests/measure_test.mjs`), run on macOS and Linux before merging.

## Install / Distribute

```bash
npx skills add Fellowship-dev/flowchad --skill '*'
```

Installs all skills into the agent directory (`.claude/skills/`, `.cursor/skills/`, etc.).

## Repository Structure

```
.flowchad/skills/*/SKILL.md   # Skill implementations (the core product)
.flowchad/skills/flow-walk/rules/  # The rule set walks are judged against (admission test in its README)
.flowchad/knowledge/          # Reference docs loaded by skills during execution
.flowchad/config.yml          # Config template — ships to user projects on install
.flowchad/templates/          # Example flow YAMLs users copy and customize
scripts/                      # Portable bash utilities called by skill specs
agents/flowchad.md            # Claude Code subagent definition (source of truth; users copy it)
docs/                         # Agent reference documentation
specs/                        # Accepted feature specs
QUALITY_SCORE.md              # Per-skill quality grades and open issues
```

## The Twelve Skills

| Command | What it does |
|---------|-------------|
| `/flowchad-setup` | Auto-discovers routes, tests, analytics — scaffolds config + flow definitions |
| `/flow-walk <name>` | Executes flow steps via Playwright CDP, captures screenshots + timing + video |
| `/flow-report <name>` | Reach-goal table, findings ranked launch blocker / should fix / later, files GitHub issues |
| `/flow-add <description>` | Creates a new flow YAML from natural language |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |
| `/flow-suggest <name>` | Prioritized improvement plan ranked by effort vs impact |
| `/flow-diff <name>` | Compares walk snapshots across time to detect regressions |
| `/flow-diagram <name>` | Generates Mermaid flowchart from a flow definition |
| `/flow-reproduce <issue-ref>` | Reproduces a customer-reported bug in-browser, attaches evidence to the GitHub issue |
| `/flow-pulse [init\|run]` | Content-matched HTTP check of each flow's key step after a deploy |
| `/flow-gate <name\|all>` | PASS/FAIL/INCOMPLETE before human testing; `--changed` lists flows a diff touches |
| `/evidence-upload` | Uploads reviewed screenshots/GIFs to the public evidence S3 bucket (opt-in) |

## Key Rules

1. **Skill specs are the core product** — edit with care; they have subtle inter-skill dependencies.
2. **Never commit credentials** to `config.yml`; use `$ENV_VAR` references only.
3. **Scripts must be portable bash** — no bash 4+ features, no `greadlink`. Test on macOS + Linux.
4. **Open an issue before a large refactor** — skill specs have cross-skill dependencies.
5. **Update QUALITY_SCORE.md** when closing skill-related issues.
6. **Live safety is a default, not a brief item** — new walking behaviour must respect `flow-walk/references/live-safety.md` (surface modes, write guard, no secrets in output, private evidence).
7. **Keep `agents/flowchad.md` in step with the skills** — it is the short behavioural version of flow-walk + flow-report + flow-gate.
8. **Rules change only through the admission test** (`flow-walk/rules/README.md`): a source or two independent flows, product-neutral wording, a CHANGELOG line, and `bash .flowchad/skills/flow-walk/scripts/lint_rules.sh` passing. No client or product names, ever: pass private terms with `FLOWCHAD_FORBIDDEN_TERMS`.

## Reference

- [Architecture](docs/architecture.md) — repo concepts: skill specs vs knowledge docs, config template, evidence hosting
- [Workflows](docs/workflows.md) — how to edit skill specs, shell scripts, contributing rules
