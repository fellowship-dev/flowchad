# Tasks: Issue #32

## Task 1 — Add "File Issues for Critical Findings" section to flow-report

**File:** `.flowchad/skills/flow-report/SKILL.md`
**Where:** After the existing "## After Report" section
**What:** New section with four steps:

### Step 1: Resolve production URL
- Read `config.yml` → look for `environments.production.url`
- If not found, read `BRIEF.md` and grep for `production:` URL
- If still not found, try `gh api /repos/{owner}/{repo} --jq .homepage`
- If all fail, mark as `UNKNOWN`

### Step 2: Determine if production check is needed
- Extract the base URL from the failed step (from `results.json` → `config.url` or step navigate target)
- If base URL matches `production_url`, no curl needed — assign P0/P1 directly
- If base URL differs (staging/preview/alias), proceed to Step 3

### Step 3: Curl each failed path on production
For each Critical finding:
```bash
PATH_TO_CHECK=$(extract path from failed step URL)
PROD_CHECK=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 "${PROD_URL}${PATH_TO_CHECK}")
CHECK_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

### Step 4: Assign severity and file issue
Three-case logic:
- `PROD_CHECK` is non-2xx (or UNKNOWN) → severity P0/P1, file as critical
- `PROD_CHECK` is 2xx → severity P2, title prefix "[P2]", body notes prod is healthy
- `PROD_URL` is UNKNOWN → severity P1, body includes "unverified" note

Issue body must include evidence block:
```markdown
**Production check:**
- URL checked: {prod_url}{path}
- Status: {status_code}
- Timestamp: {timestamp}
- Result: {Production also failing / Production healthy (200) / Production URL unknown}
```
