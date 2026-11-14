---
name: flow-walk
description: Walk a user flow using Playwright CDP — execute steps, capture screenshots, measure timing, store results. Usage /flow-walk <flow-name>
user_invocable: true
---

# Flow Walk

Execute a flow definition step-by-step using Playwright CDP, capturing screenshots and timing at each step.

## Usage

```
/flow-walk sign-up
/flow-walk login
/flow-walk checkout
```

The argument is the flow name (matches `flows/{name}.yml`).

## Prerequisites

- Chromium or Chrome running with CDP enabled, OR launch headless
- Playwright-core installed (`npm i -g playwright-core` or local)
- Flow definition in `.flowchad/flows/{name}.yml`
- Read `knowledge/live-safety.md` and `knowledge/walk-checks.md` once per session. They are the default contract for every walk; a brief only needs to state what differs.

The flow's filename (without `.yml`) is its **id**. Reports and diffs match walks by id, so it stays the same between walks.

## Execution

### Step 0: Declare Surfaces

Before opening a browser, decide the mode of every surface this walk touches (see `knowledge/live-safety.md`):

- From the brief first, then `config.yml` → `environments.<env>.surface`, then the default: localhost is `local-copy`, anything else is `read-only-live`.
- For a `local-copy`, note the commit it was built from and every way it differs from production.

Print the table before starting, e.g.:

```
Surfaces
- https://www.example.com      read-only-live
- http://localhost:3000        local-copy @ 4f2a9c1 (test keys, captured mail, domain ownership simulated)
```

### Step 0a: Load Flow & Connect Browser

```javascript
// Launch or connect to browser
// Prefer CDP connection if Chrome is already running on port 9222
// Otherwise launch headless Chromium via playwright
import { chromium } from 'playwright-core';

// Try CDP first, fall back to launch
let browser;
try {
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
} catch {
  browser = await chromium.launch({ headless: true });
}
```

Load the flow YAML from `.flowchad/flows/{name}.yml`. Parse steps. Resolve `$ENV_VAR` references from environment.

**i18n locale check:** read the `locales` field from the flow YAML (falls back to `config.yml` then defaults to `[en]`).

- `locales: [en]` — walk routes as-is. Never prefix with `/en/` or any other locale.
- `locales: [en, es]` — for each step with a relative `url`, walk the base path (en) then the `/es/` prefixed path (es). Report results per locale.
- Only generate locale-prefixed paths for locales **explicitly listed** in `locales`. Do not infer locale support from URL patterns alone.

```bash
# Read locales for this flow
FLOW_LOCALES=$(grep '^locales:' ".flowchad/flows/${FLOW_NAME}.yml" 2>/dev/null \
  || grep '^locales:' ".flowchad/config.yml" 2>/dev/null \
  || echo "locales: [en]")
# e.g. "locales: [en, es]" → parse to array ["en", "es"]
```

### Step 0b: Start Video Recording

Always walk in a fresh context (never reuse an existing browser's tabs or cookies). If the flow has `video: false`, create the context without `recordVideo`. Otherwise, start recording:

```javascript
// Create snapshot directory
const snapshotDir = `.flowchad/snapshots/${date}-${flowName}`;
await fs.mkdir(snapshotDir, { recursive: true });

// Start Playwright video recording
const viewports = flow.viewports || config.viewports || [1440, 375];
const context = await browser.newContext({
  viewport: { width: viewports[0], height: 900 },
  serviceWorkers: surface === 'read-only-live' ? 'block' : 'allow', // service-worker requests bypass context.route
  recordVideo: {
    dir: snapshotDir,
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();
```

### Step 0c: Guard Writes and Watch the Network

Attach these to the context before the first navigation. On a `read-only-live` surface the route guard aborts unsafe methods before they leave the browser, so "read-only" is enforced rather than assumed. On every surface, console and network errors are collected per step.

```javascript
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
let stepLog = { console_errors: [], failed_requests: [], blocked_writes: [] };
const where = (u) => { const x = new URL(u); return `${x.host}${x.pathname}`; }; // no query strings: they can carry tokens

if (surface === 'read-only-live') {
  await context.route('**/*', (route) => {
    const req = route.request();
    if (SAFE.has(req.method())) return route.continue();
    stepLog.blocked_writes.push({ method: req.method(), where: where(req.url()) });
    return route.abort('blockedbyclient');
  });
}
page.on('console', (m) => { if (m.type() === 'error') stepLog.console_errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => stepLog.console_errors.push(`uncaught: ${e.message.slice(0, 300)}`));
page.on('requestfailed', (r) => {
  if (r.failure()?.errorText !== 'net::ERR_BLOCKED_BY_CLIENT')
    stepLog.failed_requests.push({ method: r.method(), where: where(r.url()), error: r.failure()?.errorText });
});
page.on('response', (r) => {
  if (r.status() >= 400) stepLog.failed_requests.push({ method: r.request().method(), where: where(r.url()), status: r.status() });
});
```

After each step, copy `stepLog` into that step's result and reset it. Never log headers, cookies or request bodies.

Initialize an action log to track timestamps for smart trimming:

```javascript
const actionLog = [];  // { ts: number, action: string, detail: string, durationMs?: number }
const recordingStartTime = Date.now();
```

Log every action performed during the walk:

```javascript
function logAction(action, detail, durationMs) {
  actionLog.push({ ts: Date.now(), action, detail, durationMs });
}
```

### Step 1: Execute Each Step

For each step in the flow:

0. **Gate writes** — if the step has `effect: write`, `send` or `pay` and the surface is `read-only-live`, do not perform it. Record the step as `skipped` with reason `stopped before a write step (surface is read-only-live)`, mark the flow's `stopped_at`, and end this flow. The remaining steps belong on a test instance or local copy.

1. **Perform the action:**
   - `navigate` → `page.goto(url)`
   - `click` → `page.click(selector)`
   - `fill` → `page.fill(selector, value)`
   - `select` → `page.selectOption(selector, value)`
   - `scroll` → `page.evaluate(() => window.scrollTo(...))`  or scroll to selector
   - `wait` → `page.waitForSelector(selector)` or `page.waitForTimeout(ms)`
   - `hover` → `page.hover(selector)`

2. **Measure timing** — record `Date.now()` before and after action. Log the action:
   ```javascript
   logAction(step.action, step.selector || step.url, step.action === 'fill' ? typingDurationMs : undefined);
   ```

   Record `observed_at` (ISO 8601 with offset) and count the step toward the flow's effort: each `fill` is a typed field, each `click` a click.

3. **Wait for rendered content, then screenshot every width** — after the action, wait for what the person came for (the `expect` text, a non-empty list, the form), not just the load event; status codes do not count as success. Then capture each width in `viewports` (default `[1440, 375]`) without navigating, so toasts and inline errors are caught at every width:

   ```javascript
   for (const width of viewports) {
     await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
     await page.screenshot({ path: `${snapshotDir}/step-${nn}-${step.action}@${width}.png` });
   }
   await page.setViewportSize({ width: viewports[0], height: 900 });
   ```

4. **Evaluate expect** — this is the key AI step:
   - Read the `expect` string from the YAML (natural language)
   - Look at the screenshots, the current URL and the visible text (including iframes for third-party embeds)
   - Determine if the expectation is met; an empty state or "nothing available" where the goal needs content is a `fail`
   - Copy the exact words the person sees for anything that matters (headings, errors, empty states, buttons) into `words`
   - Record as `pass`, `fail`, or `error`

4b. **Cross-check claims** — if the screen states a fact (a record is valid, a value to copy, "checked", "sent", a total), verify it independently and record it under `truth_checks` (see `knowledge/walk-checks.md`).

4c. **Mark first value** — if the step has `first_value: true` and passes, record the elapsed time since the flow's first navigation as `time_to_first_value_ms`.

5. **Check timing threshold** — if `timing` is specified and actual > threshold, flag as `slow`

### Step 2: Handle Errors

**A broken step is a finding, not a failure.** If a step throws:
- Catch the error
- Take a screenshot of the current state
- Log the error message
- Record status as `error`
- **Continue to the next step** (unless it's a navigation failure that blocks everything)

If a step has `optional: true` and fails, record but don't flag as critical.

If a step has `bot_check: true` (or the legacy `captcha: true`), or the walk meets a bot check it did not expect, do not stop and do not try to defeat it. Follow `knowledge/live-safety.md` §5: switch to a local copy or test instance with the provider's test keys, or ask the person to pass that one step in a headed browser and continue in the same session (`human_assisted: true`), or use Navvi if configured. Record which route was taken.

After the last step, record whether the flow reached its `goal` (`goal_reached`) and, if not, `stopped_at`: the step, the screen and the exact words where it stopped.

### Step 2a: Dead-End Pass

After the happy path, spend a short pass on the dead ends in `knowledge/walk-checks.md` (used and expired links, repeated wrong password, limits, someone else's item, an empty account, back/refresh/double submit). On a `read-only-live` surface only try those that need no writes. Record each under `dead_ends` with the words shown and whether the person can recover.

### Step 2b: Stop Recording & Smart Trim

Close the page and context to finalize the video:

```javascript
await page.close();  // triggers video save
const videoPath = await page.video().path();
```

**Smart trim** — cut dead frames using the action log. This removes periods where nothing happens, producing a fluid replay of just the interactions.

```bash
# Extract video duration
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
FPS=$(ffprobe -v error -select_streams v -show_entries stream=r_frame_rate -of csv=p=0 "$VIDEO" | bc)
```

**Trim algorithm:**
1. For each logged action, calculate a keep-window:
   - **Before**: 1 second before the action
   - **After**: 3 seconds after the action (for `fill` actions: typing duration + 3s)
2. Merge overlapping windows
3. If trimmed version is <80% of original length, produce the trimmed cut
4. Use ffmpeg `select` filter to keep only the action windows:

```bash
# Build ffmpeg select filter from action windows
# Example: select='between(t,2.1,6.1)+between(t,8.5,12.5)'
ffmpeg -y -i "$VIDEO" \
  -vf "select='$SELECT_EXPR',setpts=N/FRAME_RATE/TB" \
  -af "aselect='$SELECT_EXPR',asetpts=N/SR/TB" \
  "${SNAPSHOT_DIR}/${FLOW_NAME}-trimmed.mp4" 2>/dev/null
```

**GIF conversion** (for embedding in issues/PRs):

```bash
# Two-pass palette-optimized GIF
ffmpeg -y -i "${TRIMMED_OR_FULL}" -vf "fps=8,scale=800:-1:flags=lanczos,palettegen" /tmp/palette.png
ffmpeg -y -i "${TRIMMED_OR_FULL}" -i /tmp/palette.png \
  -lavfi "fps=8,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse" \
  "${SNAPSHOT_DIR}/${FLOW_NAME}.gif"
```

**Output files:**
- `{flow-name}-full.webm` — raw Playwright recording
- `{flow-name}-trimmed.mp4` — action-only cut (if trim saves >20%)
- `{flow-name}.gif` — palette-optimized GIF (from trimmed if available, else full)

### Step 3: Store Results

Create a dated snapshot directory:

```
.flowchad/snapshots/
└── {YYYY-MM-DD}-{flow-name}/
    ├── step-01-navigate@1440.png
    ├── step-01-navigate@375.png
    ├── step-02-fill@1440.png
    ├── ...
    ├── {flow-name}-full.webm
    ├── {flow-name}-trimmed.mp4
    ├── {flow-name}.gif
    └── results.json
```

### results.json Schema

```json
{
  "flow": "sign-up",
  "name": "New user signs up with email and password and lands on the dashboard",
  "goal": "Account exists and the dashboard shows the person's first result",
  "timestamp": "2026-03-20T15:30:00-03:00",
  "finished_at": "2026-03-20T15:31:12-03:00",
  "duration_ms": 8500,
  "config": {
    "url": "https://staging.example.com",
    "headless": true,
    "viewports": [1440, 375]
  },
  "surface": {
    "mode": "write-allowed-test",
    "commit": null,
    "differences_from_production": []
  },
  "goal_reached": false,
  "stopped_at": { "step": 4, "screen": "/signup", "words": "Something went wrong. Please try again." },
  "counts": { "typed_fields": 2, "clicks": 1, "time_to_first_value_ms": null },
  "steps": [
    {
      "index": 1,
      "action": "navigate",
      "target": "/signup",
      "status": "pass",
      "observed_at": "2026-03-20T15:30:02-03:00",
      "timing_ms": 1200,
      "threshold_ms": 2000,
      "slow": false,
      "screenshots": { "1440": "step-01-navigate@1440.png", "375": "step-01-navigate@375.png" },
      "expect": "registration form visible",
      "expect_met": true,
      "words": ["Create your account", "Sign up"],
      "console_errors": [],
      "failed_requests": [],
      "blocked_writes": [],
      "truth_checks": []
    },
    {
      "index": 2,
      "action": "fill",
      "target": "#email",
      "status": "pass",
      "observed_at": "2026-03-20T15:30:04-03:00",
      "timing_ms": 150,
      "screenshots": { "1440": "step-02-fill@1440.png", "375": "step-02-fill@375.png" }
    }
  ],
  "dead_ends": [
    { "case": "used verification link", "words": "This link has expired", "recoverable": true, "observed_at": "2026-03-20T15:31:05-03:00" }
  ],
  "environment_checks": [
    { "what": "app host resolves and serves TLS", "result": "ok", "checked_at": "2026-03-20T15:29:58-03:00" }
  ],
  "residual_risk": [],
  "video": {
    "full": "sign-up-full.webm",
    "trimmed": "sign-up-trimmed.mp4",
    "gif": "sign-up.gif",
    "full_duration_s": 32.1,
    "trimmed_duration_s": 8.4
  },
  "action_log": [
    { "ts": 1711270365123, "action": "navigate", "detail": "/signup" },
    { "ts": 1711270366500, "action": "fill", "detail": "#email", "durationMs": 800 }
  ],
  "summary": {
    "total": 4,
    "passed": 3,
    "failed": 1,
    "errors": 0,
    "skipped": 0,
    "slow": 1,
    "pass_rate": 0.75
  }
}
```

`steps[].screenshots` maps width to file. Snapshots written before this schema have a single `screenshot` string instead; downstream skills accept both.

### Step 4: Upload Evidence (only when asked)

Evidence stays local by default. Upload only when the brief asks for published evidence or `config.yml` sets `evidence.backend: s3`. Before uploading, look at every file: nothing may show real account details, tokens or customer data (`knowledge/live-safety.md` §4). Uploads go to the public evidence bucket through the `evidence-upload` skill and cannot be deleted by the walker.

```bash
UPLOAD=$(ls .flowchad/skills/evidence-upload/scripts/upload_evidence.sh \
            .claude/skills/evidence-upload/scripts/upload_evidence.sh \
            .agents/skills/evidence-upload/scripts/upload_evidence.sh 2>/dev/null | head -1)

# Upload each screenshot (owner/repo is detected from git remote origin)
for screenshot in ${SNAPSHOT_DIR}/step-*.png; do
  URL=$(bash "$UPLOAD" --url-only --prefix "${FLOW_NAME}/${DATE}" "$screenshot")
  # Store URL in results
done

# Upload GIF if it exists
if [ -f "${SNAPSHOT_DIR}/${FLOW_NAME}.gif" ]; then
  GIF_URL=$(bash "$UPLOAD" --url-only --prefix "${FLOW_NAME}/${DATE}" "${SNAPSHOT_DIR}/${FLOW_NAME}.gif")
fi
```

Add evidence URLs to `results.json`:

```json
{
  "evidence": {
    "backend": "s3",
    "screenshots": {
      "step-01-navigate": "https://<bucket>.s3.<region>.amazonaws.com/owner/repo/flow/date/3f9c0a1b2c3d4e5f-step-01-navigate.png"
    },
    "gif": "https://<bucket>.s3.<region>.amazonaws.com/owner/repo/flow/date/9a8b7c6d5e4f3a2b-flow.gif"
  }
}
```

If evidence upload fails (secret not configured, network error), log a warning and continue — evidence is best-effort, never blocks the walk.

### Step 5: Clean Up

Close the page, context and browser. Stop any local server or container the walk started and any machine created for it. Print what was left running, if anything, and why.

## Output

After the walk completes, print a summary:

```
## Flow Walk: sign-up

Surface: staging.example.com (write-allowed-test)
✓ step 1: navigate /signup (1.2s)  15:30:02
✓ step 2: fill #email (0.15s)       15:30:04
✗ step 3: fill #password — element not found
✓ step 4: click submit (2.8s) ⚠️ slow (threshold: 2s)

Goal reached: no — stopped at step 3 (/signup)
Results: 3/4 passed, 1 slow · typed 1 · clicks 1 · first value: not reached
Console errors: 2 (step 4) · failed requests: 1 (POST /api/signup 500)
Snapshot: .flowchad/snapshots/2026-03-20-sign-up/
```

### Show the GIF

If a GIF was generated, **always show it to the user immediately**. Use the Read tool to display the GIF file — it renders inline in VS Code and most terminals:

```
Read the GIF file: .flowchad/snapshots/{date}-{flow-name}/{flow-name}.gif
```

This is the "magic moment" — the user sees their flow animated right in the chat.

### Suggest next steps with context-aware viewing tips

```
📎 **Walk recording saved!**

**View the GIF:**
- It's displayed above ↑ (if you're in VS Code / Claude Code)
- Open it in Finder: `open .flowchad/snapshots/2026-03-20-sign-up/sign-up.gif`
- Drag it into a GitHub PR or issue for inline preview

**Video:** .flowchad/snapshots/2026-03-20-sign-up/sign-up-trimmed.mp4

**Next:**
- `/flow-report sign-up` — generate a friction report from these results
- `/flow-suggest sign-up` — get prioritized improvement suggestions
```
