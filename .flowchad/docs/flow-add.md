# Flow Add

Create a new flow definition from a natural language description of a feature or user journey.

## Usage

```
/flow-add User signs up with Google OAuth and lands on the dashboard
/flow-add We added a weekly digest email preview to the domain settings page
/flow-add Admin bulk-deletes users from the team management page
```

## Step 1: Parse Intent

Extract from the user's description:
- **Actor**: who is performing the flow (new user, admin, returning user, etc.)
- **Action**: what they're doing (signs up, configures, exports, etc.)
- **Outcome**: what success looks like (lands on dashboard, sees confirmation, etc.)
- **Qualifiers**: any constraints (via OAuth, from mobile, in bulk, etc.)

## Step 2: Scan Codebase

Read the project to inform the flow definition:

### 2a. Check existing flows for duplicates

```bash
ls .flowchad/flows/*.yml 2>/dev/null
```

Read each flow's `name` field. If a flow already covers the same scenario, tell the user and suggest `/flow-update` instead. If a related but different flow exists (e.g., email sign-up exists, user wants OAuth sign-up), note it — the new flow may share steps.

### 2b. Find relevant routes

Look for routes matching the described feature:

```bash
# Rails
grep -n "the relevant path or controller" config/routes.rb 2>/dev/null

# Next.js
find app pages -name "page.tsx" -o -name "page.jsx" 2>/dev/null | grep -i "relevant keyword"

# Express/Hono
grep -rn "app\.\(get\|post\|put\|delete\)" --include="*.ts" --include="*.js" src/ routes/ 2>/dev/null | grep -i "relevant keyword"
```

### 2c. Find relevant components and pages

Search for UI components related to the flow:

```bash
# Find components by keyword
grep -rl "relevant keyword" --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.erb" src/ app/ components/ views/ 2>/dev/null | head -20
```

Read the relevant files to understand:
- What selectors are available (form IDs, data-testid attributes, button text)
- What the page structure looks like
- What fields/inputs exist
- What the expected navigation flow is

### 2d. Check for test credentials

```bash
grep -ri "test.*email\|test.*password\|seed\|fixture" .env.example .env.test 2>/dev/null
cat .flowchad/config.yml 2>/dev/null | grep -A2 credentials
```

## Step 3: Draft Flow YAML

Generate the flow definition following the naming convention:

### Name — a descriptive sentence

The `name` field must be a full sentence: actor + action + outcome.

```yaml
# Good
name: New user signs up with Google OAuth and lands on the onboarding wizard

# Bad
name: google-oauth-signup
```

### Filename — scenario as slug

Kebab-case the scenario for the filename:
`new-user-signs-up-with-google-oauth.yml`

### Context block — preconditions

Document the starting state:

```yaml
context:
  user: new_account
  auth: logged_out
  oauth_provider: google
```

### Steps — from codebase analysis

Build steps using real selectors found in Step 2c. Use `$ENV_VAR` for credentials.

Write rich `expect` strings that explain what a human would judge:

```yaml
expect: >
  OAuth consent screen appears because the user chose Google sign-up.
  Google logo and email selection are visible.
```

### Priority — based on flow criticality

- P0: auth, payment, core product actions
- P1: common features, settings
- P2: edge cases, nice-to-have flows

### Full example output

```yaml
# .flowchad/flows/new-user-signs-up-with-google-oauth.yml

name: New user signs up with Google OAuth and lands on the onboarding wizard
url: https://staging.example.com
tags: [onboarding, auth, oauth]
priority: P0
context:
  user: new_account
  auth: logged_out
  oauth_provider: google
credentials:
  email: $TEST_GOOGLE_EMAIL
  password: $TEST_GOOGLE_PASSWORD

steps:
  - action: navigate
    url: /signup
    expect: >
      Sign-up page loads with email/password form and social login options.
      Google OAuth button is visible and enabled.
    timing: 2s

  - action: click
    selector: "[data-testid=google-oauth-button]"
    expect: >
      Google OAuth consent screen appears or redirects to Google.
      User can select their Google account.
    timing: 5s
    captcha: true

  - action: wait
    selector: "[data-testid=onboarding-wizard]"
    expect: >
      After OAuth completes, user lands on the onboarding wizard.
      Welcome message shows the user's Google account name.
    timing: 5s
```

## Step 4: Present and Confirm

Show the complete YAML to the user. Highlight:
- Any selectors that were guessed (not found in codebase) — mark with `# VERIFY: selector not found in code`
- Any similar existing flows that were found
- Suggested filename

Ask: "Save this flow? (I can adjust selectors, steps, or expectations first)"

## Step 5: Save

On confirmation:
1. Write the file to `.flowchad/flows/{filename}.yml`
2. Print: "Created `.flowchad/flows/{filename}.yml` — run `/flow-walk {name}` to test it."
