# Flowchad

**Drop-in AI QA for any web project.** Walk user flows, screenshot each step, record trimmed videos, and get friction reports — all from Claude Code.

No CLI. No npm. No config files to learn. Clone into your project and go.

```bash
cd your-project
git clone https://github.com/Fellowship-dev/flowchad.git .flowchad
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

## Quick Start

**1. Install** — clone into any project:

```bash
cd your-project
git clone https://github.com/Fellowship-dev/flowchad.git .flowchad
```

**2. Configure** — edit `.flowchad/config.yml`:

```yaml
name: my-app
url: https://staging.example.com
type: saas  # saas | website | mobile | internal

credentials:
  email: $TEST_EMAIL
  password: $TEST_PASSWORD
```

**3. Define a flow** — create `.flowchad/flows/sign-up.yml`:

```yaml
name: sign-up
url: /signup
tags: [onboarding, critical]
priority: P0

steps:
  - action: navigate
    url: /signup
    expect: registration form visible
    timing: 2s

  - action: fill
    selector: "#email"
    value: $TEST_EMAIL

  - action: fill
    selector: "#password"
    value: $TEST_PASSWORD

  - action: click
    selector: "button[type=submit]"
    expect: redirect to /dashboard
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
name: checkout
url: /cart
tags: [payment, critical]
priority: P0          # P0 (critical) to P3 (nice-to-have)
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
├── skills/          # AI skills (walk, report, suggest, diff, diagram, setup)
├── knowledge/       # Reference docs (friction taxonomy, metrics, platform types)
├── templates/       # Starter flows (sign-up, login, checkout, onboarding)
├── flows/           # Your project's flow definitions (YAML)
├── snapshots/       # Walk results + screenshots + videos (gitignored)
├── reports/         # Generated friction reports (gitignored)
└── config.yml       # Project config
```

## Requirements

- [Claude Code](https://claude.ai/claude-code) (runtime)
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
