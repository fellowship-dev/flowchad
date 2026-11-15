<p align="center">
  <img src="flowchad-v1-icon.png" alt="Flowchad" width="120" />
</p>

<h1 align="center">Flowchad</h1>

<p align="center">
  <strong>Drop-in AI QA for any web project.</strong>
  <br />
  Walk user flows like a first-time user, judge them against opinionated rules with sources, measure the path to value, and gate them before a human tests.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#what-it-does">What It Does</a> &middot;
  <a href="#opinionated-rules-with-sources">Rules</a> &middot;
  <a href="#flow-definition-reference">Flow Reference</a> &middot;
  <a href="#safe-on-live-systems">Live Safety</a> &middot;
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
| `/flow-report sign-up` | Reports whether each flow reaches its goal, and ranks findings as launch blockers / should fix / later with the exact words people see |
| `/flow-suggest sign-up` | Prioritized improvements ranked by effort vs impact |
| `/flow-diff sign-up` | Compares runs to catch regressions |
| `/flow-diagram sign-up` | Mermaid flowchart from your YAML definition |
| `/flow-add <description>` | Creates a new flow from natural language, scanning your codebase for selectors |
| `/flow-update <name> <change>` | Updates an existing flow to reflect product changes |
| `/flow-pulse [init\|run]` | Seconds-long after-deploy check of each flow's key step, matched on content |
| `/flow-gate sign-up` | PASS / FAIL / INCOMPLETE before a human tests: blocker rules, measures against the last walk, known rough edges; `--changed` lists the flows a diff touches |
| `/flow-reproduce <issue-ref>` | Reproduces a customer-reported bug in-browser and attaches evidence to the issue |

### Agent definition

`agents/flowchad.md` is a Claude Code subagent that applies the same defaults without a long brief. Install or update it with:

```bash
mkdir -p ~/.claude/agents   # or .claude/agents in a project
curl -fsSL https://raw.githubusercontent.com/Fellowship-dev/flowchad/main/agents/flowchad.md \
  -o ~/.claude/agents/flowchad.md
```

Re-run the same command to update; `npx skills update` does not manage agent files.

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
goal: A new account exists and the dashboard shows the person's first useful result
value_moment: The dashboard shows the person's first useful result
covers: [app/signup/*, app/dashboard/*]   # source files this flow depends on
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
    effect: write        # never performed on read-only-live surfaces
    expect: >
      Redirect to /dashboard because sign-up succeeded.
      Welcome message confirms account was created.
    timing: 3s
    first_value: true    # the value moment: measures to value are counted to here
```

Or skip manual YAML and let AI create it:

```
/flow-add User signs up with email and password and sees the dashboard
```

**4. Walk it:**

```
/flow-walk sign-up
```

**5. Gate it, then get the report:**

```
/flow-gate sign-up --target https://staging.example.com
/flow-report sign-up
```

## Opinionated Rules With Sources

FlowChad has a point of view: the best flow is the shortest honest path to the
first thing a person came for. Every walk is judged against a small set of
rules in [`flow-walk/rules/`](.flowchad/skills/flow-walk/rules/): 44 today,
in ten groups (path to value, the primary action and the fold, decisions,
noise, wording, navigation, waiting, errors, docs cold start, agent
experience). Each rule is one sentence a reviewer can pass or fail on one
screen, says how to check it during a walk, has a severity, and names its
basis: a public source with a link (Nielsen Norman Group, Krug, GOV.UK, WCAG
2.2, Refactoring UI, Hulick, Rosenfeld/Morville/Arango, Diátaxis, Sauro & Lewis,
llms.txt, clig.dev, the MCP spec) or failures seen in at least two independent
flows.

```markdown
### FOLD-01 · The primary action is visible without scrolling

- **Rule:** The one input or primary action a step needs is fully visible without scrolling at 375 and at 1440 wide.
- **Check:** At each width, before scrolling, measure how far the bottom of the primary element sits below the viewport (`scroll_before_primary_vh`). Fail if it is above 0 at either width, or the element is hidden.
- **Threshold:** `scroll_before_primary_vh = 0`
- **Severity:** blocker
- **Basis:** source — Nielsen Norman Group, "Scrolling and Attention" (2018): people spent about 57% of page-viewing time above the fold.
```

**Measures, not adjectives.** Every walk records, per step and per flow:
screens to the value moment, decisions asked, clicks and fields, words on
screen and reading time, viewport heights scrolled before the primary action
at 375 and 1440, non-task elements (badges, banners, widgets the step does
not need), waits and whether they showed status, dead ends and loops, and
time to value; docs walks add commands to a working install and questions a
fresh agent could not answer
([measures](.flowchad/skills/flow-walk/references/measures.md)). Reports show
each number against the previous walk. Thresholds exist only where a rule
with a cited source sets one.

**A gate before "test it".** `/flow-gate` says PASS, FAIL or INCOMPLETE:
FAIL if the value moment is not reached or a blocker rule fails, INCOMPLETE
if a blocker was never judged or a read-only production walk stopped before a
write step, and it fails walks of a different host than the one the tester
will open. Rough edges (should-fix and later rules) never fail it; they are
listed first in the hand-off. `--record` writes a redacted walk record to
`.flowchad/walks/` for the project to commit, and `--changed` lists which
saved flows a branch touches since their last walk.

**Map first.** A flow can be saved as a plain Mermaid flow chart with its
value moment (`.flowchad/flows/<id>.map.md`) before anything is built, and
`/flow-walk <id> --map` judges the chart against the flow-shape rules
([flow maps](.flowchad/skills/flow-walk/references/flow-maps.md)). Shorten it
from the value moment backwards, then build.

### How this differs from a checklist

A generic checklist asks "is it usable?" and gets "mostly". These rules are
few, narrow and countable; each names what to look at on one screen; the
walk keeps the numbers, so the next walk shows whether the path got shorter;
blockers decide whether a human should be asked to test at all; and the set
changes only with evidence.

### Adding or changing a rule

New rules come from walks: a report lists problems no rule covers under "Not
covered by a rule". One becomes a rule when it can be worded without the
product's nouns and either a public source supports it or the same problem
appears in a second, independent flow. The
[admission test](.flowchad/skills/flow-walk/rules/README.md#admission-test)
lists the criteria; `bash .flowchad/skills/flow-walk/scripts/lint_rules.sh`
enforces the ones a script can check (format, unique ids, a basis with a link
or a count of two flows, no product or vendor names, both examples, a
CHANGELOG line, thresholds only with a source). Rules are retired, never
deleted or reused, when better evidence contradicts them.

**Disagree with a rule?** For one flow, add a `rule_overrides` entry with
the reason; the gate shows it as an accepted exception. For everyone, open a
pull request that changes, replaces or retires the rule, with evidence: a
source, or walks of independent flows. Projects can keep their own rules in
`.flowchad/rules/`.

## Safe on Live Systems

Every walk starts by declaring each host it touches (`flow-walk/references/live-safety.md`). Any host not declared, including the production APIs, payment providers and analytics a local build calls, is `read-only-live`.

| Mode | The walker may |
|---|---|
| `read-only-live` (any host not declared) | look and click links; anything except GET, HEAD and OPTIONS, and WebSockets, is blocked in the browser and reported |
| `write-allowed-test` | create test accounts and data, submit forms, receive captured mail |
| `local-copy` | anything, on a build of a named commit with test keys; the report lists how it differs from production |

The block is mechanical: `flow-walk/scripts/guard.mjs` is installed on every walk and classifies each request by host, and contexts always block service workers. `tests/guard_test.mjs` checks it with a real browser against servers that count what arrives (fetch, XHR, beacons, workers, form posts in pages, iframes and popups, WebSockets); see flow-walk Step 0c for exactly what is and is not verified.

Steps that write carry `effect: write | send | pay` and are never performed on live systems. Secrets are never printed, evidence stays local unless you opt in, and bot checks are handled with test keys on a local copy or a human-assisted step instead of stopping the walk.

Walks on production are read-only by the same rules: they record what real settings show (bot checks, sign-in providers) up to the first write step, and the gate reports INCOMPLETE until the rest is walked on a test surface or a local copy of the same commit.

Walks also apply the checks in `flow-walk/references/walk-checks.md` by default: rendered content over status codes, a timestamp on every observation with environmental findings re-checked before the report, every width captured at the same moment without reloading, truth cross-checks of what screens claim, a dead-end pass, and console and network errors per step.

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

Evidence stays in `.flowchad/snapshots/` by default. Opt in to uploading screenshots and GIFs to a public S3 bucket for embedding in GitHub issues and PRs (`/flow-reproduce` uploads because attaching evidence is its job). Private repos don't render repo-relative or `raw.githubusercontent.com` images for most viewers; bucket URLs render everywhere and never expire.

```yaml
evidence:
  backend: s3        # none (default) | s3
```

**Upgrading from 0.3:** the default changed from `s3` to `none`. If you relied on automatic uploads, set `evidence.backend: s3` explicitly; walks then still check every file before uploading.

Provide the upload secret through the environment only: `EVIDENCE_AWS_ACCESS_KEY_ID`, `EVIDENCE_AWS_SECRET_ACCESS_KEY`, `EVIDENCE_BUCKET`, `EVIDENCE_REGION`, `EVIDENCE_PUBLIC_BASE_URL`. The `evidence-upload` skill ships `scripts/upload_evidence.sh` (curl ≥ 7.75, no other dependencies), which prints each public URL and a ready-to-paste Markdown line.

**Anything uploaded is publicly readable by URL and the uploader cannot delete it** — the walker looks at every file first and never uploads secrets, real account details, customer PII or production data; prefer staging or synthetic screenshots.

## Flow Definition Reference

### Naming Convention

Flow names are descriptive sentences — like RSpec `describe`/`it` blocks. Self-explanatory without project context.

```yaml
# Bad
name: sign-up

# Good
name: New user signs up with email and password and lands on the dashboard
```

Filenames mirror the scenario as a slug: `new-user-signs-up-with-email-and-password.yml`. The filename is the flow's id: reports, diffs and pulse checks compare walks by it, so keep it stable.

Every flow has a one-sentence `goal`; the report's first table says whether each flow reaches it today.

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
  effect: write                      # write | send | pay — skipped on read-only-live surfaces
  first_value: true                  # shows the flow's value_moment
  primary: "#site-url"               # the one input this screen asks for (default: next step's selector)
  bot_check: true                    # test keys on a local copy, or a human-assisted step
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
viewports: [1440, 375] # widths captured at every step, same session (default)
surface: write-allowed-test  # override the environment's mode for this flow
```

## Friction Reports

Reports open with a surface table and a per-flow "does it reach its goal today" table, then rank findings as **launch blockers / should fix / later**. Each finding names the screen, the exact words the person sees, why it hurts, the smallest fix, and whether the owner (booking, payment, DNS, copy) or code must act. Counts (typed fields, clicks, time to first value), what improved since the last walk, and where test surfaces differ from production follow.

Severity is classified into three levels:

- **Critical** — user cannot complete their task (blocked, data loss, crash)
- **Friction** — user can complete but it's unnecessarily hard (slow, confusing, extra steps)
- **Cosmetic** — works fine but looks rough (typos, alignment, placeholder text)


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
├── flows/             # Your flow definitions (YAML) and flow maps (*.map.md)
├── walks/             # Walk records from /flow-gate --record (committed, redacted)
└── rules/             # Optional project rules, same format as flow-walk/rules
```

The skills (tooling) live in `.agents/skills/` and are managed by `npx skills`.
The project data (config + flows) lives in `.flowchad/` and is committed to git.

## Requirements

- An AI coding agent — [Claude Code](https://claude.ai/claude-code), Cursor, GitHub Copilot, Windsurf, Gemini, OpenHands, or [any of 40+ supported agents](https://skills.sh)
- Chrome or Chromium (for Playwright CDP, or run headless)

Optional:
- [Navvi](https://github.com/Fellowship-dev/navvi) (headed automation; one option for steps behind bot checks)
- ffmpeg (for video recording + trimming)

## How It Compares

| | Flowchad | Cypress/Playwright e2e | Manual QA |
|---|---|---|---|
| Setup time | `npx skills add` | Hours of config | N/A |
| Maintenance | Zero (YAML + AI) | Constant (brittle selectors) | N/A |
| Reports | Auto-generated friction reports | Pass/fail only | Spreadsheets |
| Video | Smart-trimmed action replays | Raw recordings | Screen recordings |
| Cost | Free | Free | $$$/hour |
| Intelligence | AI judges each step against rules with cited sources, and counts the path to value | Assertions only | Human judgment |
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
npx skills remove flow-walk flow-report flow-add flow-update flow-suggest flow-diff flow-diagram flow-reproduce flow-pulse flow-gate flowchad-setup evidence-upload -y
npx skills add Fellowship-dev/flowchad --skill '*'
```

**Or install globally so updates work:**
```bash
npx skills add Fellowship-dev/flowchad --skill '*' -g
```

## License

MIT
