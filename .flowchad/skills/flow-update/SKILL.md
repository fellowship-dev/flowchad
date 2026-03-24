---
name: flow-update
description: Update an existing flow definition to reflect product changes — reads codebase diffs, updates steps/expectations/context. Usage /flow-update <flow-name> <what changed>
user_invocable: true
---

# Flow Update

Update an existing flow definition to match current product state after a feature change.

## Usage

```
/flow-update dmarc-setup The DMARC wizard now has 4 steps instead of 3
/flow-update checkout We switched from Stripe Elements to Stripe Checkout
/flow-update sign-up Added a "terms of service" checkbox before submit
```

First word is the flow name (or filename slug). Rest describes what changed.

## Step 1: Load Existing Flow

```bash
# Try exact match first, then fuzzy
ls .flowchad/flows/*{name}*.yml 2>/dev/null
```

Read the full YAML. If the flow doesn't exist, list available flows and ask the user to pick one.

Parse the current state:
- `name` (sentence description)
- `context` (preconditions)
- `steps` (actions, selectors, expects)
- `tags`, `priority`

## Step 2: Understand the Change

From the user's description, determine:
- **What changed**: new steps, removed steps, modified selectors, changed expectations
- **Scope**: is this a minor tweak (one step) or a flow restructure (new wizard steps)?

### 2a. Scan for code changes

Look at recent changes related to the flow:

```bash
# Recent commits touching relevant files
git log --oneline -10 -- $(grep -rl "relevant keyword" --include="*.tsx" --include="*.jsx" --include="*.erb" --include="*.rb" src/ app/ 2>/dev/null | head -10)
```

### 2b. Read current code

Find the relevant components/pages and read them to understand the new state:

```bash
# Find components related to the flow
grep -rl "relevant keyword" --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.erb" src/ app/ components/ views/ 2>/dev/null | head -20
```

Read these files to discover:
- New or changed selectors
- Added/removed form fields
- Modified navigation flow
- Updated validation rules

### 2c. Check for broken selectors

For each selector in the existing flow, verify it still exists in the codebase:

```bash
# Check each selector
grep -r "data-testid=get-started" --include="*.tsx" --include="*.jsx" src/ app/ 2>/dev/null
grep -r 'id="email"' --include="*.tsx" --include="*.jsx" --include="*.erb" src/ app/ 2>/dev/null
```

Flag any selectors that no longer appear in the code.

## Step 3: Draft Updates

Apply the changes to the flow:

### Update `name` if the scenario changed

If the flow now covers a different scenario (e.g., 3-step wizard → 4-step wizard), update the name:

```yaml
# Before
name: New user completes 3-step DMARC setup wizard

# After
name: New user completes 4-step DMARC setup wizard with SPF validation
```

### Update `context` if preconditions changed

```yaml
# Before
context:
  dmarc_enabled: false

# After
context:
  dmarc_enabled: false
  spf_record: missing    # new prerequisite
```

### Update `steps`

- **Add** new steps at the right position
- **Remove** steps that no longer exist
- **Modify** selectors that changed
- **Update** `expect` strings to match new behavior
- Mark guessed selectors with `# VERIFY: not found in code`

### Update `tags` and `priority` if warranted

## Step 4: Show Diff

Present the changes as a clear before/after diff. Show ONLY what changed, not the entire file:

```
## Flow Update: dmarc-setup

### Name
- New user completes 3-step DMARC setup wizard
+ New user completes 4-step DMARC setup wizard with SPF validation

### Context
+ spf_record: missing

### Steps
  Step 3 (unchanged): click "Next" → DKIM configuration
+ Step 4 (NEW): SPF validation step
    action: wait
    selector: "[data-testid=spf-check]"
    expect: SPF validation runs and shows pass/fail result
  Step 5 (was 4): click "Finish" → dashboard

### Selectors verified: 4/5
⚠️ [data-testid=spf-check] — not found in code (new component?)
```

Ask: "Apply these changes?"

## Step 5: Save

On confirmation:
1. Write the updated YAML to the same file
2. If the scenario changed significantly, suggest renaming the file to match
3. Print: "Updated `.flowchad/flows/{filename}.yml` — run `/flow-walk {name}` to verify the changes."

## Edge Cases

- **Flow renamed**: if the filename should change, create the new file and delete the old one
- **Multiple flows affected**: if a product change impacts several flows, list them all and offer to update each
- **Breaking changes**: if a selector is gone and no replacement is obvious, mark the step with `# BROKEN: selector removed, needs manual fix` rather than guessing
