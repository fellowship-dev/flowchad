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

### Step 0: Load Flow & Connect Browser

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

2. **Measure timing** — record `Date.now()` before and after action

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

### Step 3: Store Results

Create a dated snapshot directory:

```
.flowchad/snapshots/
└── {YYYY-MM-DD}-{flow-name}/
    ├── step-01-navigate.png
    ├── step-02-fill.png
    ├── step-03-fill.png
    ├── step-04-click.png
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

Then suggest: "Run `/flow-report sign-up` to generate a friction report from these results."
