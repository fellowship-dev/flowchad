<p align="center">
  <img src="flowchad-v1-icon.png" alt="Flowchad" width="128" height="128">
</p>

# Flowchad

**Drop-in AI QA for any web project.** Walk user flows, screenshot each step, record trimmed videos, and get friction reports — all from Claude Code, Cursor, Copilot, and 40+ other agents.

```bash
npx skills add Fellowship-dev/flowchad
```

---

## What It Does

| Command | What happens |
|---------|-------------|
| `/flow-walk sign-up` | Walks the flow step-by-step, captures screenshots + timing + video |
| `/flow-report sign-up` | Categorizes findings as Critical / Friction / Cosmetic |
| `/flow-suggest sign-up` | Prioritized improvements ranked by effort vs impact |
| `/flow-diff sign-up` | Compares runs to catch regressions |
| `/flow-diagram sign-up` | Mermaid flowchart from your YAML definition |
| `/flow-add <description>` | Creates a new flow from natural language, scanning your codebase for selectors |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |

## Quick Start

**1. Install** — add skills to any project:

```bash
npx skills add Fellowship-dev/flowchad
```

This installs all FlowChad skills into your agent's directory (`.claude/skills/`, `.cursor/skills/`, etc.) with drift detection via `skills-lock.json`. Update anytime with `npx skills update`.

<details>
<summary>Alternative: manual clone</summary>

```bash
git clone https://github.com/Fellowship-dev/flowchad.git .flowchad
```

Then symlink skills into your agent directory:
```bash
mkdir -p .claude/skills
for skill in .flowchad/skills/*/; do
  ln -s "../../.flowchad/skills/$(basename $skill)" ".claude/skills/$(basename $skill)"
done
```
</details>

**2. Configure** — edit `.flowchad/config.yml`:

```yaml
name: my-app
url: https://staging.example.com
type: saas  # saas | website | mobile | internal

credentials:
  email: $TEST_EMAIL
  password: $TEST_PASSWORD
```

**3. Define a flow** — create `.flowchad/flows/new-user-signs-up-with-email-and-password.yml`:

```yaml
name: New user signs up with email and password and lands on the dashboard
url: /signup
tags: [onboarding, critical]
priority: P0
context:
  user: new_account
  auth: logged_out

steps:
  - action: navigate
    url: /signup
    expect: >
      Registration form is visible with email and password fields.
      No error messages shown. Submit button is enabled.
    timing: 2s

  - action: fill
    selector: "#email"
    value: $TEST_EMAIL

  - action: fill
    selector: "#password"
    value: $TEST_PASSWORD

  - action: click
    selector: "button[type=submit]"
    expect: >
      Redirect to /dashboard because sign-up succeeded.
      Welcome message confirms account was created.
    timing: 3s
```

**4. Walk it:**

```
/flow-walk sign-up
```

**5. Get the report:**

```
/flow-report sign-up
```

Or skip steps 2-3 and let the setup skill auto-discover your routes, tests, and analytics:

```
/flowchad-setup
```

## Video Recording

Flow walks automatically record video. The recording is **smart-trimmed** — dead frames where nothing happens are cut out, keeping only 1s before and 3s after each action. You get a fluid video of the actual interactions, not a 5-minute screen recording with 30 seconds of action.

Output:
- `{flow-name}.mp4` — full recording
- `{flow-name}-trimmed.mp4` — action-only cut (if trim saves >20%)
- `{flow-name}.gif` — palette-optimized GIF for issues/PRs

Disable with `video: false` in your flow YAML or config.

## Evidence Upload

Screenshots and GIFs can be uploaded automatically for embedding in GitHub issues and PRs. Configure in `config.yml`:

```yaml
evidence:
  backend: git       # git (default) | s3 | navvi
  branch: evidence   # orphan branch name (git backend)
```

**Git backend (default)** — uploads to a dedicated orphan branch via the GitHub Contents API. Zero external deps, works with any PAT. Initialize once:

```bash
./scripts/evidence-init.sh owner/repo
```

**S3/R2 backend** — for teams with existing cloud storage. Set `s3_bucket`, `s3_endpoint`, and `s3_public_url` in config.

**Navvi backend** — drags files into GitHub's UI via headed browser. Produces GitHub-hosted URLs but requires browser credentials.

## Flow Definition Reference

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

### Step Options

```yaml
- action: click
  selector: "button.submit"
  expect: redirect to /dashboard     # natural language — AI evaluates
  timing: 3s                         # flag if slower than this
  optional: true                     # don't fail the flow if this breaks
  captcha: true                      # skip in headless, delegate to Navvi
```

### Flow-Level Options

```yaml
name: Mobile user checks out cart with Apple Pay on a small viewport
url: /cart
tags: [payment, critical]
priority: P0          # P0 (critical) to P3 (nice-to-have)
context:
  user: existing
  auth: logged_in
  cart_items: 1
  browser: mobile
video: true           # record video (default: true)
viewport:             # override default 1280x720
  width: 375
  height: 812
```

## Friction Reports

Reports classify every finding into three levels:

- **Critical** — user cannot complete their task (blocked, data loss, crash)
- **Friction** — user can complete but it's unnecessarily hard (slow, confusing, extra steps)
- **Cosmetic** — works fine but looks rough (typos, alignment, placeholder text)

Each finding includes what's wrong, why it matters, a suggested fix, and effort estimate.

## Project Structure

```
.flowchad/
├── commands/        # Slash commands for Claude Code
├── skills/          # AI skills (walk, report, suggest, diff, diagram, setup, evidence)
├── knowledge/       # Reference docs (friction taxonomy, metrics, platform types)
├── templates/       # Starter flows (sign-up, login, checkout, onboarding)
├── flows/           # Your project's flow definitions (YAML)
├── snapshots/       # Walk results + screenshots + videos (gitignored)
├── reports/         # Generated friction reports (gitignored)
└── config.yml       # Project config
scripts/
├── evidence-init.sh   # Create evidence orphan branch
└── evidence-upload.sh # Upload files to evidence branch
```

## Requirements

- An AI coding agent — [Claude Code](https://claude.ai/claude-code), Cursor, GitHub Copilot, Windsurf, Gemini, OpenHands, or [any of 40+ supported agents](https://skills.sh)
- Chrome or Chromium (for Playwright CDP, or run headless)

Optional:
- [Navvi](https://github.com/Fellowship-dev/navvi) (for flows with CAPTCHAs or bot detection)
- ffmpeg (for video recording + trimming)

## How It Compares

| | Flowchad | Cypress/Playwright e2e | Manual QA |
|---|---|---|---|
| Setup time | 2 minutes | Hours | N/A |
| Maintenance | Zero (YAML + AI) | Constant (brittle selectors) | N/A |
| Reports | Auto-generated friction reports | Pass/fail only | Spreadsheets |
| Video | Smart-trimmed action replays | Raw recordings | Screen recordings |
| Cost | Free | Free | $$$/hour |
| Intelligence | AI evaluates UX quality | Assertions only | Human judgment |

## License

MIT
