---
name: flowchad
description: Drop-in AI QA — walk user flows, screenshot each step, record video, generate friction reports. Activates when working with .flowchad/ directories, flow YAML definitions, or QA/UX testing tasks.
---

# Flowchad

AI-powered QA tool that walks user flows, captures screenshots and video, and generates friction reports.

## Commands

These commands are available when Flowchad is installed. Invoke them as slash commands:

| Command | What it does |
|---------|-------------|
| `/flowchad-setup` | Auto-discover routes, tests, analytics — scaffold flow definitions |
| `/flow-walk <name>` | Walk a flow step-by-step, capture screenshots + timing + video |
| `/flow-report <name>` | Categorize findings as Critical / Friction / Cosmetic |
| `/flow-suggest <name>` | Prioritized improvements ranked by effort vs impact |
| `/flow-diff <name>` | Compare runs to catch regressions |
| `/flow-diagram <name>` | Mermaid flowchart from YAML definition |
| `/flow-add <description>` | Create a new flow from natural language |
| `/flow-update <name> <change>` | Update an existing flow after product changes |

Detailed instructions for each command are in `.flowchad/docs/`.

## Project Structure

```
.flowchad/
├── docs/            # Detailed command instructions
├── knowledge/       # Reference docs (friction taxonomy, metrics, platform types)
├── templates/       # Starter flows (sign-up, login, checkout, onboarding)
├── flows/           # Your project's flow definitions (YAML)
├── snapshots/       # Walk results + screenshots + videos (gitignored)
├── reports/         # Generated friction reports (gitignored)
└── config.yml       # Project config
```

## Flow Definition Schema

Every flow lives in `.flowchad/flows/*.yml`. One file per flow.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Descriptive sentence explaining the scenario |
| `url` | string | Starting URL (base or full) |
| `steps` | list | Ordered steps to execute |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `context` | map | `{}` | Preconditions — machine-readable, self-documenting |
| `tags` | list | `[]` | Categorization tags for filtering |
| `priority` | enum | `P1` | `P0` (critical), `P1` (important), `P2` (nice-to-have) |
| `credentials` | map | `{}` | Env var references for auth (never hardcode) |
| `headed` | bool | `false` | Force headed browser (delegates to Navvi) |
| `video` | bool | `true` | Record video (requires ffmpeg for trimming) |
| `viewport` | map | `{width: 1280, height: 720}` | Browser viewport size |

### Naming Convention

Flow names read like RSpec `describe`/`it` blocks — self-explanatory without project context:

```yaml
# Bad
name: sign-up

# Good
name: New user signs up with email and password and lands on the dashboard
```

Filename mirrors the scenario: `new-user-signs-up-with-email-and-password.yml`

### Context Block

Document preconditions for the scenario:

```yaml
context:
  user: new_account
  auth: logged_out
  plan: free
```

### Actions

| Action | Fields | Description |
|--------|--------|-------------|
| `navigate` | `url` | Go to a URL |
| `fill` | `selector`, `value` | Type into an input |
| `click` | `selector` | Click an element |
| `select` | `selector`, `value` | Choose from dropdown |
| `scroll` | `selector` or `direction` | Scroll to element or direction |
| `wait` | `selector` or `ms` | Wait for element or duration |
| `hover` | `selector` | Hover over element |

### Expect — Natural Language Evaluation

The `expect` field is AI-evaluated against screenshots and DOM state. Write rich descriptions:

```yaml
expect: >
  Registration form is visible with email and password fields.
  No error messages shown. Submit button is enabled.
```

### Variable Substitution

Use `$ENV_VAR` syntax for credentials: `value: $TEST_EMAIL`

## Friction Classification

Three severity levels (see `knowledge/friction-taxonomy.md` for decision tree):

- **Critical** — user cannot complete their task (blocked, data loss, crash)
- **Friction** — user can complete but it's unnecessarily hard (slow, confusing)
- **Cosmetic** — works fine but looks rough (typos, alignment, placeholder text)

## Evidence Upload

Screenshots and GIFs can be uploaded for embedding in GitHub issues/PRs. Configure in `config.yml`:

```yaml
evidence:
  backend: git       # git (default) | s3 | navvi
  branch: evidence   # orphan branch name (git backend)
```

- **git** (default): uploads to orphan branch via GitHub Contents API
- **s3**: uploads to S3/R2 bucket
- **navvi**: drags files into GitHub UI via headed browser

See `.flowchad/docs/evidence-upload.md` for details.

## Executing Commands

When the user invokes a command (e.g., `/flow-walk sign-up`):

1. Read the detailed instructions from `.flowchad/docs/{command}.md`
2. Read relevant knowledge docs from `.flowchad/knowledge/`
3. Read the project config from `.flowchad/config.yml`
4. Execute the command following the instructions
