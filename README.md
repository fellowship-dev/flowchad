<p align="center">
  <img src="flowchad-v1-icon.png" alt="Flowchad" width="120" />
</p>

<h1 align="center">Flowchad</h1>

<p align="center">
  <strong>Drop-in AI QA for any web project.</strong>
  <br />
  Walk user flows, screenshot each step, record trimmed videos, and get friction reports.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#what-it-does">What It Does</a> &middot;
  <a href="#flow-definition-reference">Flow Reference</a> &middot;
  <a href="#evidence-upload">Evidence Upload</a> &middot;
  <a href="#how-it-compares">Compare</a>
</p>

## Getting Started

```bash
npx skills add Fellowship-dev/flowchad --skill '*'
```

Works with Claude Code, Cursor, GitHub Copilot, Windsurf, Gemini, OpenHands, and [40+ other agents](https://skills.sh).

---

## What It Does

| Skill | What happens |
|-------|-------------|
| `/flowchad-setup` | Auto-discovers routes, tests, and analytics — scaffolds flow definitions |
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
# install all skills to a specific agent without prompts:
npx skills add Fellowship-dev/flowchad --skill '*' --agent claude-code -y
```

This installs all FlowChad skills into your agent's directory (`.claude/skills/`, `.cursor/skills/`, etc.) with drift detection via `skills-lock.json`. Update anytime with `npx skills update`.

<details>
<summary>Alternative: scaffold data directory only</summary>

If you just need the project data directory (config + flows) without installing skills:

```bash
curl -fsSL https://raw.githubusercontent.com/Fellowship-dev/flowchad/main/install.sh | bash
```

Then install skills separately: `npx skills add Fellowship-dev/flowchad --skill '*'`
</details>

**2. Setup** — let the AI auto-discover your project:

```
/flowchad-setup
```

This scans your codebase for routes, existing tests, analytics SDKs, and test credentials, then scaffolds flow definitions and config automatically.

Or configure manually — edit `.flowchad/config.yml`:

```yaml
name: my-app
url: https://staging.example.com
type: saas  # saas | website | mobile | internal

credentials:
  email: $TEST_EMAIL
  password: $TEST_PASSWORD
```

The `type` field tells the AI which evaluation criteria to apply during `/flow-report`:

| Type | Product category | Focus areas |
|------|-----------------|-------------|
| `saas` | Web app with accounts | Onboarding, conversion funnels, billing, collaboration |
| `website` | Marketing / docs / blog | SEO, accessibility, Core Web Vitals, CTAs |
| `mobile` | iOS / Android app | Touch targets, offline behavior, gestures, state preservation |
| `internal` | Admin / ops tool | Efficiency (clicks-to-task), power-user patterns, error recovery |

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

Or skip manual YAML and let AI create it:

```
/flow-add User signs up with email and password and sees the dashboard
```

**4. Walk it:**

```
/flow-walk sign-up
```

**5. Get the report:**

```
/flow-report sign-up
```

## Video Recording

Flow walks automatically record video. The recording is **smart-trimmed** — dead frames where nothing happens are cut out.

**Trim algorithm:**
1. Build an action log — a timestamp is recorded before each step executes.
2. For each logged action, compute a keep-window: 1 second before the action, 3 seconds after (for `fill` steps: typing duration + 3 seconds after).
3. Merge overlapping keep-windows.
4. If the merged windows cover less than 80% of the original duration (i.e., trimming saves >20%), produce the trimmed cut via ffmpeg. Otherwise keep the full recording only.

Output:
- `{flow-name}-full.webm` — raw Playwright recording
- `{flow-name}-trimmed.mp4` — action-only cut (created only if trim saves >20%)
- `{flow-name}.gif` — palette-optimized GIF for issues/PRs (from trimmed cut if available, else full)

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
# or omit the repo — it auto-detects from your git remote origin:
./scripts/evidence-init.sh
```

The script is idempotent: if the evidence branch already exists it exits cleanly with no changes.

**S3/R2 backend** — for teams with existing cloud storage. Set `s3_bucket`, `s3_endpoint`, and `s3_public_url` in config.

**Navvi backend** — drags files into GitHub's UI via headed browser. Produces GitHub-hosted URLs but requires browser credentials.

## Flow Definition Reference

### Naming Convention

Flow names are descriptive sentences — like RSpec `describe`/`it` blocks. Self-explanatory without project context.

```yaml
# Bad
name: sign-up

# Good
name: New user signs up with email and password and lands on the dashboard
```

Filenames mirror the scenario as a slug: `new-user-signs-up-with-email-and-password.yml`

### Context Block

Document preconditions for the scenario — machine-readable and self-documenting:

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
| `scroll` | `selector` or `value` | Scroll to element or to a direction (`top`/`bottom`/`down`) |
| `wait` | `selector` or `ms` | Wait for element or duration |
| `hover` | `selector` | Hover over element |

### Step Options

```yaml
- action: click
  selector: "button.submit"
  expect: >
    Redirect to /dashboard because sign-up succeeded.
    Welcome message confirms account was created.
  timing: 3s                         # flag if slower than this
  optional: true                     # don't fail the flow if this breaks
  captcha: true                      # skip in headless, delegate to Navvi
```

**Timing thresholds** — steps that exceed `timing` are reported as Friction findings. General guidance:

| Duration | Perception | Guidance |
|----------|------------|----------|
| < 300ms | Fast | Acceptable for most interactions |
| 300ms – 1s | Noticeable | Needs a loading indicator or skeleton screen |
| 1s – 3s | Slow | Requires a progress indicator; users may lose context |
| > 3s | Frustrating | Must show progress with time estimate |
| > 10s | Broken | Users assume failure; provide cancel and recovery |

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

### Issue Priority (P0 / P1 / P2)

When `/flow-report` files GitHub issues for Critical findings, it first checks whether production is actually affected:

1. Resolves the production URL from (in order): `config.yml → environments.production.url`, then `BRIEF.md` in the project root, then `gh api` repo homepage field.
2. Curls the failed path on production.
3. Assigns priority based on the result:

| Result | Priority | Label |
|--------|----------|-------|
| Production also fails (non-2xx) | **P0** (error) or **P1** (fail) | `[P0]` or `[P1]` |
| Production returns 200, staging fails | **P2** — regression risk only | `[P2] … (staging only — prod healthy)` |
| Production URL could not be resolved | **P1 unverified** | `[P1] … (production status unverified)` |

If the flow was already run against the production URL, no curl is needed — P0/P1 is assigned directly.

## Locale Detection

`/flowchad-setup` auto-detects which locales your project supports. The detection runs in this priority order:

1. **Next.js config** — reads `i18n.locales` from `next.config.js` / `next.config.ts`
2. **Locale directories** — looks for `locales/` or `messages/` directories in the project root
3. **Strapi i18n plugin** — checks for Strapi i18n configuration (locales are stored in DB; detection falls through to step 4)
4. **hreflang tags** — fetches the production homepage URL (from `config.yml`) and parses `link[rel=alternate][hreflang]` tags to extract locale codes
5. **Default** — falls back to `[en]` (English only, no locale-prefixed paths)

The detected locales are written to `locales:` in `.flowchad/config.yml`. Re-run `/flowchad-setup` after i18n config changes.

When walking flows, `locales: [en]` means routes are walked as-is (no `/en/` prefix). `locales: [en, es]` walks each route twice — once at the base path and once at the `/es/`-prefixed path — and reports results per locale.

## Project Structure

After installation, your project has two FlowChad layers:

```
.agents/skills/        # Skill source files (installed by npx skills add)
.claude/skills/        # Symlinks to .agents/skills/ (Claude Code)
.flowchad/             # Project data — tracked in git (shared knowledge)
├── config.yml         # Project config (URL, timing, credentials)
└── flows/             # Your flow definitions (YAML)
```

The skills (tooling) live in `.agents/skills/` and are managed by `npx skills`.
The project data (config + flows) lives in `.flowchad/` and is committed to git.

## Requirements

- An AI coding agent — [Claude Code](https://claude.ai/claude-code), Cursor, GitHub Copilot, Windsurf, Gemini, OpenHands, or [any of 40+ supported agents](https://skills.sh)
- Chrome or Chromium (for Playwright CDP, or run headless)

Optional:
- [Navvi](https://github.com/Fellowship-dev/navvi) (for flows with CAPTCHAs or bot detection)
- ffmpeg (for video recording + trimming)

## How It Compares

| | Flowchad | Cypress/Playwright e2e | Manual QA |
|---|---|---|---|
| Setup time | `npx skills add` | Hours of config | N/A |
| Maintenance | Zero (YAML + AI) | Constant (brittle selectors) | N/A |
| Reports | Auto-generated friction reports | Pass/fail only | Spreadsheets |
| Video | Smart-trimmed action replays | Raw recordings | Screen recordings |
| Cost | Free | Free | $$$/hour |
| Intelligence | AI evaluates UX quality | Assertions only | Human judgment |
| Agent support | 40+ agents | Framework-specific | N/A |

## FAQ

### Why does `npx skills add` flag some skills as "High Risk" or "Med Risk"?

The security risk scores come from automated scanners (Gen, Socket, Snyk) that analyze the skill instructions for shell commands, file system access, and network calls. FlowChad is a QA tool that **by design** needs to:

- Run `grep` and `find` to scan your codebase for routes and selectors
- Launch a browser via Playwright to walk your flows
- Read and write files (screenshots, reports, flow definitions)
- Access `.env` files for test credentials

A tool that automates browsers and scans codebases *should* have file and network access — that's the whole point. The scanners flag these patterns because they'd be suspicious in a CSS formatting skill, but they're expected for a QA tool.

### Why does `npx skills update` say "up to date" when skills have changed?

This is a [known bug](https://github.com/vercel-labs/skills/issues/337) — `skills update` only tracks globally installed skills (installed with `-g`). Project-scoped installs don't get written to the global lock file, so updates are never detected.

**Workaround — remove by skill names, then re-add:**
```bash
npx skills remove flow-walk flow-report flow-add flow-update flow-suggest flow-diff flow-diagram flowchad-setup evidence-upload -y
npx skills add Fellowship-dev/flowchad --skill '*'
```

**Or install globally so updates work:**
```bash
npx skills add Fellowship-dev/flowchad --skill '*' -g
```

## License

MIT
