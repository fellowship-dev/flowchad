---
name: flow-reproduce
description: Reproduce a customer-reported bug in-browser given a GitHub issue with error details. Walks an inferred flow, captures evidence, and updates the original issue with reproduction outcome + steps-to-reproduce. Usage /flow-reproduce <issue-ref>
user_invocable: true
---

# Flow Reproduce

Given a GitHub issue containing error details (stack trace, user action, URL), attempt to reproduce the bug in-browser. Attach a screen recording and structured steps-to-reproduce to the original issue, then label it `reproduced` or `could-not-reproduce`.

## Usage

```
/flow-reproduce 42
/flow-reproduce fellowship-dev/myapp#42
/flow-reproduce https://github.com/fellowship-dev/myapp/issues/42
```

The argument is a GitHub issue reference. If the project has a default repo configured in `.flowchad/config.yml` (via `repo:` field), a bare number works. Otherwise use the full `owner/repo#N` form or a GitHub issue URL.

---

## Phase 1: Parse Issue Context

### Step 1a: Resolve the Issue Reference

Parse the argument to extract `OWNER`, `REPO`, and `ISSUE_NUMBER`:

```bash
ARG="$1"

# Full URL: https://github.com/owner/repo/issues/42
if echo "$ARG" | grep -qE '^https://github\.com/'; then
  OWNER=$(echo "$ARG" | sed -E 's|https://github.com/([^/]+)/([^/]+)/issues/([0-9]+)|\1|')
  REPO=$(echo "$ARG" | sed -E 's|https://github.com/([^/]+)/([^/]+)/issues/([0-9]+)|\2|')
  ISSUE_NUMBER=$(echo "$ARG" | sed -E 's|https://github.com/([^/]+)/([^/]+)/issues/([0-9]+)|\3|')
  FULL_REPO="${OWNER}/${REPO}"

# owner/repo#N form
elif echo "$ARG" | grep -qE '^[^/]+/[^#]+#[0-9]+$'; then
  FULL_REPO=$(echo "$ARG" | cut -d'#' -f1)
  ISSUE_NUMBER=$(echo "$ARG" | cut -d'#' -f2)

# Bare number — use git remote or config.yml repo field
else
  ISSUE_NUMBER="$ARG"
  FULL_REPO=$(git remote get-url origin 2>/dev/null \
    | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|' \
    || grep '^repo:' .flowchad/config.yml 2>/dev/null | awk '{print $2}')
fi

if [ -z "$FULL_REPO" ] || [ -z "$ISSUE_NUMBER" ]; then
  echo "Error: could not resolve repo. Pass the full reference: owner/repo#N or a GitHub issue URL."
  exit 1
fi

echo "Fetching issue #${ISSUE_NUMBER} from ${FULL_REPO}..."
```

### Step 1b: Fetch Issue Data

```bash
ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" \
  --repo "$FULL_REPO" \
  --json title,body,labels,comments,url,state)

ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
ISSUE_BODY=$(echo "$ISSUE_JSON" | jq -r '.body')
ISSUE_URL=$(echo "$ISSUE_JSON" | jq -r '.url')
ISSUE_STATE=$(echo "$ISSUE_JSON" | jq -r '.state')

# Combine body + all comments for full context
ISSUE_COMMENTS=$(echo "$ISSUE_JSON" | jq -r '.comments[].body' 2>/dev/null | tr '\n' ' ')
FULL_CONTEXT="${ISSUE_BODY} ${ISSUE_COMMENTS}"

echo "Issue: ${ISSUE_TITLE}"
echo "State: ${ISSUE_STATE}"
```

If the issue is already CLOSED, skip to Phase 5 (post comment noting it's closed, apply `could-not-reproduce` label if not already labeled) then exit.

### Step 1c: Extract Error Context (AI-Assisted Parsing)

Read the full issue context and extract:

**Error message** — look for patterns like:
- `Error: <message>`
- `Exception: <message>`
- `TypeError: <message>`
- `Uncaught <ErrorClass>: <message>`
- Bugsnag `error_class` / `error_message` fields
- Sentry `"type"` / `"value"` fields in JSON payloads
- Any line starting with a capitalized word followed by `: ` (heuristic)

**Affected URL** — look for:
- Explicit URLs starting with `http://` or `https://`
- Route patterns like `/path/to/page`, `/users/123/settings`
- Browser location context in Bugsnag/Sentry payloads

**Triggering action** — look for:
- Action keywords: "clicked", "click", "submitted", "submit", "navigated", "navigating", "scrolled", "loaded", "opened", "pressed"
- Button/link names following the action keyword
- Form names or field names

**Auth state** — infer from:
- Keywords: "logged in", "authenticated", "signed in", "my account", "dashboard", "admin" → `logged_in`
- Keywords: "logged out", "not logged in", "anonymous", "homepage", "landing" → `logged_out`
- Default to `logged_in` if ambiguous (most bugs happen in authenticated sessions)

**Stack trace hints** — extract the top 3 frames if a stack trace is present. Do not attempt to execute stack trace code — use it only as context for the `expect` assertions.

Store extracted fields:
```
ERROR_MESSAGE=<extracted or "unknown error">
AFFECTED_URL=<extracted or "">
TRIGGERING_ACTION=<extracted or "">
AUTH_STATE=<logged_in|logged_out>
STACK_HINT=<top frame or "">
```

If `AFFECTED_URL` is empty after parsing, **ask the user before proceeding**:
```
Could not infer the affected URL from issue #${ISSUE_NUMBER}.
Please provide the URL where the bug occurs (e.g., https://staging.example.com/settings):
```
Wait for the user's response and use it as `AFFECTED_URL`.

---

## Phase 2: Infer Reproduction Flow

### Step 2a: Build Flow YAML

Construct a minimal reproduction flow. The goal is the fewest steps needed to reach and trigger the bug.

**Standard flow structure:**

```yaml
# .flowchad/flows/reproduce-issue-{N}.yml
name: Reproduce issue #{N} — {ERROR_MESSAGE} at {AFFECTED_URL}
url: {BASE_URL_FROM_CONFIG_OR_AFFECTED_URL}
tags: [reproduction, issue-{N}]
priority: P0
locales: [en]
context:
  user: {AUTH_STATE}
  auth: {AUTH_STATE}
  source_issue: "{ISSUE_URL}"
  error: "{ERROR_MESSAGE}"

steps:
  - action: navigate
    url: {AFFECTED_URL_PATH}
    expect: >
      Page loads without a full-page error. The relevant UI for {TRIGGERING_ACTION or "the reported action"}
      should be visible. If a 500, 404, or error page appears, that is the bug.
    timing: 5s

  # Add triggering action step if one was identified
  # {TRIGGERING_ACTION_STEP — see rules below}

  - action: wait
    selector: "body"
    expect: >
      Observe the page state after {TRIGGERING_ACTION or "navigation"}.
      Look for: JavaScript console errors, error banners, empty states where content
      should be, broken UI elements, redirect loops, or any indicator matching
      the reported error "{ERROR_MESSAGE}".
    timing: 3s
```

**Triggering action step rules:**

- If action is `click` + button/link identified → `action: click, selector: [text or data-testid]`
- If action is `submit` or `fill` → `action: fill` for each field, then `action: click` on submit
- If action is `navigate` or `load` → no extra step (already covered by first `navigate`)
- If action is `scroll` → `action: scroll, selector: body`
- If action is ambiguous → add a `wait` with a rich `expect` that describes what to look for

**Auth preamble:** If `AUTH_STATE=logged_in` and config.yml has credentials, prepend login steps:

```yaml
  - action: navigate
    url: /login
    expect: Login form is visible with email and password fields.
    timing: 3s

  - action: fill
    selector: "[name=email], [type=email], #email"
    value: $TEST_USER_EMAIL
    expect: Email field accepts input.

  - action: fill
    selector: "[name=password], [type=password], #password"
    value: $TEST_USER_PASSWORD
    expect: Password field accepts input.

  - action: click
    selector: "[type=submit], button[type=submit], .login-button"
    effect: write  # signing in creates a session: not on read-only-live hosts
    expect: Login succeeds and user is redirected to the app. Auth cookies set.
    timing: 5s
```

If credentials are not configured, add a comment in the YAML noting manual auth may be required, and proceed anyway (the navigate step will hit the login redirect which may itself be informative).

### Step 2b: Resolve Base URL

Reproduce on a writable surface whenever one exists. Priority: `environments.staging.url`, then `environments.dev.url`, then top-level `url` if it is localhost. Never fall back to production or to the affected URL's host on your own.

```bash
BASE_URL=$(grep -A2 'staging:' .flowchad/config.yml 2>/dev/null | grep 'url:' | awk '{print $2}' | head -1)
BASE_URL="${BASE_URL:-$(grep -A2 'dev:' .flowchad/config.yml 2>/dev/null | grep 'url:' | awk '{print $2}' | head -1)}"
TOP_URL=$(grep '^url:' .flowchad/config.yml 2>/dev/null | awk '{print $2}' | head -1)
case "$TOP_URL" in http://localhost*|http://127.0.0.1*) BASE_URL="${BASE_URL:-$TOP_URL}" ;; esac
BASE_URL="${BASE_URL%/}"
```

If `BASE_URL` is still empty, ask the user which URL to use. If they choose production (or the affected URL's host), that host is `read-only-live`: the walk stops before every `effect: write` step, including sign-in, and the write guard blocks anything except GET, HEAD and OPTIONS. Say in the issue comment that only the read-only part was reproduced.

If `AFFECTED_URL` is a full URL, compute `AFFECTED_URL_PATH` as the path component:
```bash
AFFECTED_URL_PATH=$(echo "$AFFECTED_URL" | sed -E 's|https?://[^/]+(/.*)?|\1|')
AFFECTED_URL_PATH="${AFFECTED_URL_PATH:-/}"
```

### Step 2c: Save Flow and Confirm

Save the inferred flow to `.flowchad/flows/reproduce-issue-${ISSUE_NUMBER}.yml`.

Print the inferred flow to the user:
```
## Inferred Reproduction Flow

File: .flowchad/flows/reproduce-issue-{N}.yml
Steps: {step_count}

{YAML content}

Proceeding with walk...
```

Proceed without asking only when `BASE_URL`'s host is declared `write-allowed-test` or `local-copy` in `config.yml`. Otherwise show the surface table and the flow, and wait for the user's go.

---

## Phase 3: Walk the Flow

Execute the inferred flow using the same Playwright CDP model as `flow-walk`. Refer to that skill for the full execution specification. Key points for reproduction:

- Declare the surface first and apply `flow-walk`'s write guard (Steps 0 and 0c). If reproducing the bug needs a write on a `read-only-live` surface, reproduce it on staging or a local copy instead and say so in the issue comment.

### Create Snapshot Directory

```bash
DATE=$(date +%Y-%m-%d)
SNAPSHOT_DIR=".flowchad/snapshots/${DATE}-reproduce-issue-${ISSUE_NUMBER}"
mkdir -p "$SNAPSHOT_DIR"
```

### Connect Browser and Install the Write Guard

The guard is not optional here either. Find flow-walk's `scripts/guard.mjs` (installed next to this skill); if it cannot be found, stop and say so rather than walk unguarded.

```bash
GUARD=$(ls .flowchad/skills/flow-walk/scripts/guard.mjs \
           .claude/skills/flow-walk/scripts/guard.mjs \
           .agents/skills/flow-walk/scripts/guard.mjs 2>/dev/null | head -1)
[ -n "$GUARD" ] || { echo "flow-walk guard not found: install the flow-walk skill"; exit 1; }
```

```javascript
import { chromium } from 'playwright-core';
const { installGuard } = await import(path.resolve(GUARD));

let browser;
try {
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
} catch {
  browser = await chromium.launch({ headless: true });
}
const context = await browser.newContext({
  serviceWorkers: 'block', // service-worker requests do not pass through the guard
  recordVideo: { dir: SNAPSHOT_DIR, size: { width: 1280, height: 720 } },
});
// Only hosts declared writable in config.yml; every other host is read-only-live.
const guard = await installGuard(context, { [new URL(BASE_URL).host]: BASE_SURFACE });
const page = await context.newPage();
// after each step: Object.assign(stepResult, guard.take());
```

`BASE_SURFACE` is the declared mode of `BASE_URL`'s host (`write-allowed-test` or `local-copy`), or `read-only-live` when the user chose production; in that last case pass `{}`.

### Execute Steps

For each step in the inferred flow:
1. Perform the action (navigate, fill, click, wait, scroll)
2. Record timing
3. Take screenshot: `step-{N:02d}-{action}.png`
4. Evaluate the `expect` string against the screenshot + DOM
5. Capture JavaScript console errors via `page.on('console', ...)` — console errors are additional evidence
6. Record status: `pass`, `fail`, `error`

**Capture console errors:**
```javascript
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
  }
});
page.on('pageerror', err => {
  consoleErrors.push({ type: 'uncaught', text: err.message, ts: Date.now() });
});
```

Add `console_errors` to the step result in `results.json` when present.

### Record Video

The context created above records video. Follow flow-walk's smart trim + GIF conversion steps after closing the context.

### Error Matching

After each step, check if visible text or console errors contain the reported error message:

```javascript
const pageText = await page.textContent('body').catch(() => '');
const hasErrorMatch = pageText.toLowerCase().includes(ERROR_MESSAGE.toLowerCase())
  || consoleErrors.some(e => e.text.toLowerCase().includes(ERROR_MESSAGE.toLowerCase()));
```

Record `error_match: true` in the step result when the reported error is visibly reproduced.

---

## Phase 4: Determine Outcome

### Load Results

Read `results.json` from the snapshot directory. Evaluate:

```javascript
const steps = results.steps;

const reproduced = steps.some(s =>
  s.status === 'error'
  || s.status === 'fail'
  || s.error_match === true
) || consoleErrors.some(e =>
  e.text.toLowerCase().includes(ERROR_MESSAGE.toLowerCase())
);

const outcome = reproduced ? 'reproduced' : 'could-not-reproduce';
```

**Reproduced criteria (any one sufficient):**
- Any step has status `error` or `fail`
- Any step has `error_match: true` (visible page text or console error matches reported message)
- The final screenshot shows a visible error page (5xx, "something went wrong", crash dialog)

**Could not reproduce criteria:**
- All steps passed with no error indicators
- None of the error patterns from the issue were observed

Save outcome to `results.json`:
```json
{
  "reproduction": {
    "outcome": "reproduced",
    "matched_error": "TypeError: Cannot read property 'id' of undefined",
    "matched_at_step": 3,
    "console_errors": [...]
  }
}
```

---

## Phase 5: Update GitHub Issue

### Step 5a: Upload Evidence

Upload only when `config.yml` sets `evidence.backend: s3` or the user confirms uploading for this issue. Otherwise skip this step and reference local paths in the comment. Before any upload, open each file and confirm it shows no real account details, tokens or customer data (`flow-walk/references/live-safety.md` §4). Uploads go to a public bucket through the `evidence-upload` skill (`EVIDENCE_*` env secret) and cannot be deleted by the uploader.

```bash
UPLOAD=$(ls .flowchad/skills/evidence-upload/scripts/upload_evidence.sh \
            .claude/skills/evidence-upload/scripts/upload_evidence.sh \
            .agents/skills/evidence-upload/scripts/upload_evidence.sh 2>/dev/null | head -1)
PREFIX="reproduce-issue-${ISSUE_NUMBER}/${DATE}"

# Upload screenshots
GIF_URL=""
for screenshot in "${SNAPSHOT_DIR}"/step-*.png; do
  [ -f "$screenshot" ] || continue
  bash "$UPLOAD" --url-only --prefix "$PREFIX" "$screenshot" || true
done

# Upload GIF
if [ -f "${SNAPSHOT_DIR}/reproduce-issue-${ISSUE_NUMBER}.gif" ]; then
  GIF_URL=$(bash "$UPLOAD" --url-only --prefix "$PREFIX" \
    "${SNAPSHOT_DIR}/reproduce-issue-${ISSUE_NUMBER}.gif") || true
fi
```

If evidence upload fails, use local file paths and note in the comment that evidence is local-only.

### Step 5b: Apply Label

```bash
# Ensure labels exist
gh label create "reproduced" --repo "$FULL_REPO" \
  --color "0E8A16" --description "Bug successfully reproduced" 2>/dev/null || true
gh label create "could-not-reproduce" --repo "$FULL_REPO" \
  --color "C2E0C6" --description "Could not reproduce the reported bug" 2>/dev/null || true

gh issue edit "$ISSUE_NUMBER" --repo "$FULL_REPO" \
  --add-label "$outcome"
```

### Step 5c: Post Structured Comment

Build and post the comment:

**When reproduced:**

```markdown
## :bug: Reproduced

FlowChad successfully reproduced this bug. Screen recording and steps attached below.

### Steps to Reproduce

| # | Action | Target | Outcome |
|---|--------|--------|---------|
| 1 | navigate | {url} | {pass/fail/error} |
| 2 | {action} | {target} | {status} |
...

### Error Observed

> {ERROR_MESSAGE}

Matched at step {N}: {screenshot-inline-if-available}

### Evidence

![Reproduction recording]({GIF_URL or local path})

| Field | Value |
|-------|-------|
| URL | {AFFECTED_URL} |
| Base URL | {BASE_URL} |
| Flow file | `.flowchad/flows/reproduce-issue-{N}.yml` |
| Snapshot dir | `.flowchad/snapshots/{date}-reproduce-issue-{N}/` |
| Date | {ISO datetime} |
| Browser | Chromium (Playwright headless) |

### Next Steps

Run `/flow-walk reproduce-issue-{N}` after your fix to verify it no longer reproduces.

---
*Posted by FlowChad `/flow-reproduce` — issue #{N}*
```

**When could not reproduce:**

```markdown
## :white_check_mark: Could Not Reproduce

FlowChad attempted to reproduce this bug but all steps passed without observing the reported error.

### Steps Attempted

| # | Action | Target | Outcome |
|---|--------|--------|---------|
| 1 | navigate | {url} | {status} |
...

### What Was Tried

- Navigated to: `{AFFECTED_URL}`
- Triggering action: `{TRIGGERING_ACTION or "not identified — only navigation attempted"}`
- Auth state: `{AUTH_STATE}`
- Error searched for: `{ERROR_MESSAGE}`

### Evidence

![Walk recording]({GIF_URL or local path})

| Field | Value |
|-------|-------|
| URL | {AFFECTED_URL} |
| Base URL | {BASE_URL} |
| Flow file | `.flowchad/flows/reproduce-issue-{N}.yml` |
| Date | {ISO datetime} |
| Browser | Chromium (Playwright headless) |

### Possible Reasons

1. Bug requires specific user data or database state not present in the test environment
2. Auth credentials not configured — bug may only occur in authenticated sessions
3. Timing/race condition — try running the flow manually: `/flow-walk reproduce-issue-{N}`
4. Environment-specific — bug may only occur on a specific OS/browser/screen size
5. Bug was already fixed in the current codebase

---
*Posted by FlowChad `/flow-reproduce` — issue #{N}*
```

Post the comment:
```bash
gh issue comment "$ISSUE_NUMBER" --repo "$FULL_REPO" --body "$COMMENT_BODY"
```

### Step 5d: Handle Unavailable GitHub Auth

If `gh issue comment` fails (no auth, no network), print the full comment body to stdout so the user can post it manually:

```
[flowchad] GitHub auth unavailable — copy and paste the following comment manually:

---
{COMMENT_BODY}
---

Label to apply: {outcome}
```

---

## Output Summary

After the full flow completes:

```
## Flow Reproduce: issue #{N}

Outcome: REPRODUCED ✗  (or  COULD NOT REPRODUCE ✓)
Steps:   {passed}/{total} passed
GIF:     {path or URL}
Label:   {outcome} applied to {ISSUE_URL}
Comment: {comment_url}

Flow saved: .flowchad/flows/reproduce-issue-{N}.yml
Snapshot:   .flowchad/snapshots/{date}-reproduce-issue-{N}/

Next: run /flow-walk reproduce-issue-{N} after the fix to verify it no longer reproduces.
```

If a GIF was generated, display it inline (Read the GIF file — it renders in Claude Code and VS Code).

---

## Graceful Degradation

| Failure | Behavior |
|---------|----------|
| Browser unavailable (no Playwright, no Chrome) | Print "could not start browser" error, post `could-not-reproduce` comment with error message, exit |
| URL cannot be inferred | Ask user for URL before proceeding |
| GitHub auth unavailable | Print label + comment for manual application, save results locally |
| Evidence upload fails | Continue without evidence URLs, use local paths in comment |
| Issue is already CLOSED | Post comment noting issue is closed, skip label change |
| Walk errors on first step (navigation fails) | Record error, continue to observation step, report `error` outcome |
