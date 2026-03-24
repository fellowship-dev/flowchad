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

## Execution

### Step 0: Load Flow, Connect Browser & Start Recording

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

### Step 0b: Start Video Recording

If the flow has `video: false`, skip this step. Otherwise, start recording:

```javascript
// Create snapshot directory
const snapshotDir = `.flowchad/snapshots/${date}-${flowName}`;
await fs.mkdir(snapshotDir, { recursive: true });

// Start Playwright video recording
const context = await browser.newContext({
  recordVideo: {
    dir: snapshotDir,
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();
```

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

3. **Take screenshot** — `page.screenshot({ path: snapshotDir/step-{N}-{action}.png, fullPage: false })`

4. **Evaluate expect** — this is the key AI step:
   - Read the `expect` string from the YAML (natural language)
   - Look at the screenshot and current page URL/DOM
   - Determine if the expectation is met
   - Record as `pass`, `fail`, or `error`

5. **Check timing threshold** — if `timing` is specified and actual > threshold, flag as `slow`

### Step 2: Handle Errors

**A broken step is a finding, not a failure.** If a step throws:
- Catch the error
- Take a screenshot of the current state
- Log the error message
- Record status as `error`
- **Continue to the next step** (unless it's a navigation failure that blocks everything)

If a step has `optional: true` and fails, record but don't flag as critical.

If a step has `captcha: true`, skip with status `skipped` and note "requires headed browser (Navvi)".

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
    ├── step-01-navigate.png
    ├── step-02-fill.png
    ├── step-03-fill.png
    ├── step-04-click.png
    ├── {flow-name}-full.webm
    ├── {flow-name}-trimmed.mp4
    ├── {flow-name}.gif
    └── results.json
```

### results.json Schema

```json
{
  "flow": "sign-up",
  "timestamp": "2026-03-20T15:30:00-03:00",
  "duration_ms": 8500,
  "config": {
    "url": "https://staging.example.com",
    "headless": true
  },
  "steps": [
    {
      "index": 1,
      "action": "navigate",
      "target": "/signup",
      "status": "pass",
      "timing_ms": 1200,
      "threshold_ms": 2000,
      "slow": false,
      "screenshot": "step-01-navigate.png",
      "expect": "registration form visible",
      "expect_met": true
    },
    {
      "index": 2,
      "action": "fill",
      "target": "#email",
      "status": "pass",
      "timing_ms": 150,
      "screenshot": "step-02-fill.png"
    }
  ],
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

### Step 4: Upload Evidence

After snapshots are saved, upload visual evidence for embedding in issues/PRs.

Read the evidence backend from `config.yml` (default: `git`). Follow the `evidence-upload` skill instructions.

**Git backend (default):**

```bash
# Detect repo
REPO=$(git remote get-url origin | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')

# Initialize evidence branch if needed (first run only)
.flowchad/../scripts/evidence-init.sh "$REPO"

# Upload each screenshot
for screenshot in ${SNAPSHOT_DIR}/step-*.png; do
  FILENAME=$(basename "$screenshot")
  URL=$(.flowchad/../scripts/evidence-upload.sh "$screenshot" "$REPO" "${FLOW_NAME}/${DATE}/${FILENAME}")
  # Store URL in results
done

# Upload GIF if it exists
if [ -f "${SNAPSHOT_DIR}/${FLOW_NAME}.gif" ]; then
  GIF_URL=$(.flowchad/../scripts/evidence-upload.sh "${SNAPSHOT_DIR}/${FLOW_NAME}.gif" "$REPO" "${FLOW_NAME}/${DATE}/${FLOW_NAME}.gif")
fi
```

Add evidence URLs to `results.json`:

```json
{
  "evidence": {
    "backend": "git",
    "screenshots": {
      "step-01-navigate": "https://raw.githubusercontent.com/owner/repo/evidence/flow/date/step-01-navigate.png"
    },
    "gif": "https://raw.githubusercontent.com/owner/repo/evidence/flow/date/flow.gif"
  }
}
```

If evidence upload fails (no `gh` auth, network error), log a warning and continue — evidence is best-effort, never blocks the walk.

## Output

After the walk completes, print a summary:

```
## Flow Walk: sign-up

✓ step 1: navigate /signup (1.2s)
✓ step 2: fill #email (0.15s)
✗ step 3: fill #password — element not found
✓ step 4: click submit (2.8s) ⚠️ slow (threshold: 2s)

Results: 3/4 passed, 1 slow
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
