---
name: flowchad-setup
description: Initialize Flowchad in a project — auto-discover existing tests, analytics, specs, and user flows, then scaffold flow definitions. Run as first step before any /flow-walk.
user_invocable: true
---

# Flowchad Setup

Initialize Flowchad in a project by discovering what already exists, asking what's missing, and scaffolding flow definitions.

## Phase 1: Auto-Discovery (no user input)

Scan the project silently. Gather everything before asking a single question.

### 1a. Detect Test Framework & Existing Flows

Search for e2e/integration tests — these are flows already defined in code.

```bash
# Find test files
find . -type f \( \
  -name "*.spec.ts" -o -name "*.spec.js" \
  -o -name "*.test.ts" -o -name "*.test.js" \
  -o -name "*.e2e.ts" -o -name "*.e2e.js" \
  -o -name "*_spec.rb" -o -name "*_test.rb" \
  -o -name "*.feature" \
  -o -path "*/cypress/**/*.cy.*" \
  -o -path "*/playwright/**/*" \
  -o -path "*/e2e/**/*" \
  -o -path "*/integration/**/*" \
\) 2>/dev/null | head -50
```

For each test file found, extract:
- What user flow it covers (sign up, login, checkout, etc.)
- What URLs/routes it hits
- What assertions it makes (these become `expect` in flow definitions)

### 1b. Detect Analytics SDKs

```bash
# Check dependency files for analytics
grep -r "mixpanel\|posthog\|segment\|amplitude\|google-analytics\|gtag\|plausible\|matomo" \
  package.json Gemfile requirements.txt pyproject.toml composer.json \
  2>/dev/null

# Check for SDK imports in source code
grep -rl "mixpanel\|posthog\|analytics\|segment" \
  --include="*.js" --include="*.ts" --include="*.rb" --include="*.py" \
  --include="*.jsx" --include="*.tsx" \
  src/ app/ lib/ pages/ components/ 2>/dev/null | head -20

# Check for MCP servers already configured
cat .mcp.json 2>/dev/null
cat .claude/mcp.json 2>/dev/null
```

### 1c. Detect Speckit Specs

```bash
ls .speckit/ specs/ 2>/dev/null
ls .claude/commands/speckit-* .claude/commands/spec-* 2>/dev/null
```

### 1d. Detect App Framework & Routes

```bash
# Rails
[ -f config/routes.rb ] && echo "RAILS" && cat config/routes.rb

# Next.js pages/app router
[ -d pages ] && echo "NEXTJS_PAGES" && find pages -name "*.tsx" -o -name "*.jsx" 2>/dev/null
[ -d app ] && echo "NEXTJS_APP" && find app -name "page.tsx" -o -name "page.jsx" 2>/dev/null

# Django
find . -name "urls.py" -not -path "*/venv/*" 2>/dev/null | head -5

# Express/Hono/Fastify
grep -r "app\.\(get\|post\|put\|delete\|route\)" --include="*.ts" --include="*.js" \
  src/ routes/ 2>/dev/null | head -20
```

### 1e. Detect Credentials & Staging URLs

```bash
# Look for test/staging config
grep -ri "staging\|test.*url\|base.*url\|APP_URL\|NEXT_PUBLIC" \
  .env.example .env.test .env.staging \
  config/environments/test.rb config/environments/staging.rb \
  2>/dev/null

# Check for seed/fixture users
find . -path "*/seeds*" -o -path "*/fixtures*" -o -path "*/factories*" \
  2>/dev/null | head -10
```

## Phase 2: Present Findings & Ask

Present a summary:

```
## Flowchad Setup — Discovery Report

**Framework:** [Rails / Next.js / etc.]
**Test files found:** N files across [Cypress / Playwright / RSpec / etc.]
**Existing flows detected:** [list of user journeys found in tests]
**Analytics:** [Mixpanel / PostHog / none]
**Speckit:** [installed / not found]
**Routes:** N public routes detected
**Staging URL:** [found / not found]
**Test credentials:** [found in fixtures / not found]
```

Then ask ONLY what's missing:

- If no staging URL: "What's your staging or production URL?"
- If no test credentials: "Do you have a test account? (email/password)"
- If analytics found: "Found [Mixpanel] — want me to set up the MCP server for funnel data?"
- If tests found: "Found N e2e tests — want me to convert them to Flowchad flow definitions?"
- If no tests: "No existing e2e tests found. Want me to generate flow definitions from your routes?"

## Phase 3: Scaffold

After user answers, populate the existing `.flowchad/` structure.

### Update config.yml

Fill in discovered values in `.flowchad/config.yml`:

```yaml
name: {project_name}
url: {staging_url or production_url}
type: {saas|website|mobile|internal}

timing:
  slow: 3
  critical: 10

credentials:
  email: $TEST_USER_EMAIL
  password: $TEST_USER_PASSWORD

analytics:
  provider: {mixpanel|posthog|none}
  mcp: true
```

### Convert Existing Tests to Flow Definitions

For each e2e test found, generate a `.yml` flow definition in `.flowchad/flows/`:

```yaml
# .flowchad/flows/{flow-name}.yml
# Auto-generated from: {source_test_file}
name: {Flow Name}
url: {start_url}
tags: [{category}]
priority: P0
steps:
  - action: navigate
    url: {url}
    expect: {from_test_assertion}
    timing: 3s
```

### Generate Flows from Routes (if no tests exist)

For each public route, generate a minimal flow:

```yaml
name: {Route Name}
url: {route_path}
tags: [auto-generated]
priority: P2
steps:
  - action: navigate
    url: {route_path}
    expect: status 200
    timing: 3s
```

### Set Up Analytics MCP (if applicable)

If Mixpanel detected, add to `.mcp.json`:
```json
{
  "mcpServers": {
    "mixpanel": {
      "command": "npx",
      "args": ["-y", "@mixpanel/mcp-server"],
      "env": { "MIXPANEL_TOKEN": "${MIXPANEL_TOKEN}" }
    }
  }
}
```

If PostHog detected:
```json
{
  "mcpServers": {
    "posthog": {
      "command": "npx",
      "args": ["-y", "@posthog/mcp-server"],
      "env": {
        "POSTHOG_API_KEY": "${POSTHOG_API_KEY}",
        "POSTHOG_HOST": "${POSTHOG_HOST}"
      }
    }
  }
}
```

## Phase 4: Summary

Print what was created:

```
## Flowchad initialized!

Created:
- .flowchad/config.yml (updated)
- .flowchad/flows/ — {N} flow definitions
- .mcp.json updated with {analytics_provider} (if applicable)

Next steps:
1. Review generated flows in .flowchad/flows/
2. Add test credentials to your .env
3. Run /flow-walk {first_flow} to walk your first flow
```
