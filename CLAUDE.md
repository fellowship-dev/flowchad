# Flowchad — Developer Guide

## What This Repo Is

Flowchad is a **skills package**, not a traditional application. There is no source code to run, no build step, and no test suite. The repository contains:

- **AI-readable skill specs** (`.flowchad/skills/*/SKILL.md`) — instructions for AI agents to execute each slash command
- **Knowledge base** (`.flowchad/knowledge/`) — taxonomy, schema references, and domain docs
- **Config template** (`.flowchad/config.yml`) — installed into user projects
- **Flow templates** (`.flowchad/templates/`) — example flow definitions users copy and customize
- **Shell utilities** (`scripts/`) — evidence init/upload helpers called by skill specs
- **User-facing docs** (`README.md`, `docs/`) — installation, quick start, reference

Skills are distributed via `npx skills add Fellowship-dev/flowchad --skill '*'` and installed into the user's agent directory (`.agents/skills/`, `.claude/skills/`, etc.).

## Repository Structure

```
flowchad/
├── .flowchad/
│   ├── config.yml             # Config template (copied to user projects on install)
│   ├── flows/                 # (empty in this repo; populated in user projects)
│   ├── templates/             # Example flows: sign-up.yml, login.yml, checkout.yml, onboarding.yml
│   ├── knowledge/             # Domain docs: friction taxonomy, flow schema, metrics, platform types
│   │   ├── flow-anatomy.md    # How to decompose products into testable flows
│   │   ├── flow-schema.md     # Full YAML schema reference for flow definitions
│   │   ├── friction-taxonomy.md  # Critical/Friction/Cosmetic classification decision tree
│   │   ├── goal-setting.md    # Business→Product→Flow goal hierarchy
│   │   ├── metrics-primer.md  # Latency, error rate, visual consistency guidance
│   │   └── platform-types.md  # Evaluation criteria per platform type
│   ├── commands/              # Command signatures (stub files, not implementations)
│   └── skills/                # Skill implementations (AI-readable SKILL.md specs)
│       ├── flowchad-setup/    # Initialize project, auto-discover flows
│       ├── flow-walk/         # Execute flow steps, capture screenshots + video
│       ├── flow-report/       # Analyze results, generate friction report, file issues
│       ├── flow-add/          # Create new flow from natural language
│       ├── flow-update/       # Update flow after product changes
│       ├── flow-suggest/      # Prioritize improvements by effort vs impact
│       ├── flow-diff/         # Compare snapshots, detect regressions
│       ├── flow-diagram/      # Generate Mermaid flowcharts from flow definitions
│       └── evidence-upload/   # Upload screenshots/GIFs to git/S3/Navvi
├── scripts/
│   ├── detect-i18n.sh         # Auto-detect supported locales from project config
│   ├── evidence-init.sh       # Create git orphan branch for evidence storage
│   └── evidence-upload.sh     # Upload file to git/S3 evidence backend
├── docs/                      # Extended reference documentation
├── specs/                     # Accepted feature specs (e.g., production impact verification)
├── install.sh                 # Installs .flowchad/ into a user's project
├── README.md                  # Public-facing docs (quick start, reference)
└── QUALITY_SCORE.md           # Per-skill quality grades and open issue tracking
```

## The Nine Skills

Each skill is an AI-readable SKILL.md spec that an agent executes when the user invokes the slash command:

| Command | What it does |
|---------|-------------|
| `/flowchad-setup` | Auto-discovers routes, tests, analytics — scaffolds `.flowchad/config.yml` and flow definitions |
| `/flow-walk <name>` | Executes flow steps via Playwright CDP, captures screenshots + timing + video |
| `/flow-report <name>` | Classifies findings as Critical/Friction/Cosmetic, generates markdown report, files GitHub issues |
| `/flow-add <description>` | Creates a new flow YAML from natural language, scanning codebase for selectors |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |
| `/flow-suggest <name>` | Produces prioritized improvement plan ranked by effort vs impact |
| `/flow-diff <name>` | Compares walk snapshots across time to detect regressions |
| `/flow-diagram <name>` | Generates Mermaid flowchart from a flow definition |
| `/evidence-upload` | Uploads screenshots/GIFs to configured evidence backend (called internally by other skills) |

## Key Concepts

### Skill Specs vs Knowledge Docs

**Skill specs** (`.flowchad/skills/*/SKILL.md`) are executable instructions for the AI — they tell the agent *how* to perform each command. They include shell commands, JavaScript snippets, and step-by-step procedures.

**Knowledge docs** (`.flowchad/knowledge/`) are reference material the AI reads *during* skill execution — the friction taxonomy, flow schema, and platform criteria are loaded by skills as needed.

### Config Template vs User Config

The `.flowchad/config.yml` in this repo is a **template** — it ships to the user's project on install. In a user's project, they fill in their actual URL, type, credentials, etc. Never commit credentials into this template; all sensitive values use `$ENV_VAR` references.

### Evidence Branches

The git evidence backend uses an orphan branch (default: `evidence`) — a branch with no shared history, used purely for storing binary artifacts (screenshots, GIFs). This keeps evidence out of the main git history while making URLs publicly accessible via GitHub's raw content endpoint.

## Working on Skill Specs

Skill specs are the core product. When editing a SKILL.md:

1. **Algorithm changes** — update both the SKILL.md narrative and any code snippets together. The AI reads both and will be confused if they contradict.
2. **New output fields** — if you add fields to `results.json`, update the schema in `flow-walk/SKILL.md` and any downstream skill that reads results (flow-report, flow-diff, flow-suggest).
3. **Config additions** — add new fields to `.flowchad/config.yml` as commented-out examples with inline documentation.
4. **Knowledge changes** — if the friction taxonomy or flow schema changes, update the relevant knowledge file *and* check that the affected skill specs reference the correct file path.

## Working on Shell Scripts

The scripts in `scripts/` are called by skill specs. They are plain bash, keep them portable (no bash 4+ features, no `greadlink`, etc.). Test on both macOS and Linux.

## Contributing

- Open an issue before a large refactor — skill specs have subtle dependencies
- QUALITY_SCORE.md tracks per-skill health; update it when closing skill-related issues
- The `specs/` directory contains accepted feature specs; reference them in PRs

## Requirements (for users installing this package)

- An AI coding agent (Claude Code, Cursor, GitHub Copilot, Windsurf, Gemini, OpenHands, or [40+ others](https://skills.sh))
- Chrome or Chromium (Playwright CDP, or headless)
- `ffmpeg` (optional — needed for video recording and smart-trimming)
- [Navvi](https://github.com/Fellowship-dev/navvi) (optional — needed for flows with CAPTCHAs or bot detection)
