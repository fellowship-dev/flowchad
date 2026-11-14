# Flow Definition YAML Schema

Every flow lives in `.flowchad/flows/*.yml`. One file per flow.

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Descriptive sentence explaining the scenario (see [naming convention](#naming-convention)) |
| `goal` | string | What reaching the end means for the person, in one sentence. The report's "does it reach its goal" table is judged against this. Required for new flows; older flows without it are judged against the last step's `expect`. |
| `url` | string | Starting URL (base or full) |
| `steps` | list | Ordered steps to execute |

## Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `context` | map | `{}` | Preconditions for the scenario — machine-readable, self-documenting (see [context block](#context-block)) |
| `tags` | list | `[]` | Categorization tags for filtering |
| `priority` | enum | `P1` | `P0` (critical), `P1` (important), `P2` (nice-to-have) |
| `credentials` | map | `{}` | Env var references for auth (never hardcode) |
| `headed` | bool | `false` | Force headed browser (delegates to Navvi if available) |
| `surface` | enum | from config | `read-only-live`, `write-allowed-test` or `local-copy`; overrides the environment's mode for this flow. See `knowledge/live-safety.md`. |
| `video` | bool | `true` | Record video of the walk (requires ffmpeg for trimming) |
| `viewports` | list | `[1440, 375]` | Widths captured at every step, in the same session without reloading. The first is the walking width. |
| `viewport` | map | — | Legacy single viewport; treated as `viewports: [width]` |
| `previously` | list | `[]` | Former ids (filenames) of this flow, so reports and diffs keep its history after a rename |
| `locales` | list | `[en]` | Confirmed locales for this flow (auto-detected by `/flowchad-setup`). Flow walk only generates locale-prefixed paths for locales in this list. `[en]` means no prefix (English-only site). See [i18n locale detection](#i18n-locale-detection). |

## Step Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | yes | `navigate`, `click`, `fill`, `select`, `scroll`, `wait`, `hover` |
| `url` | string | for navigate | URL or path to navigate to |
| `selector` | string | for click/fill/select/hover | CSS selector for target element |
| `value` | string | for fill/select | Value to input or option to select |
| `expect` | string | no | Human-readable expectation (AI evaluates against screenshot) |
| `timing` | string | no | Max acceptable time (e.g. `2s`, `500ms`). Exceeding = friction |
| `effect` | enum | no | `write`, `send` or `pay` when the step changes data, sends a message or email, books, or charges. The walker stops before such steps on `read-only-live` surfaces. Omit for steps that only read. |
| `first_value` | bool | no | Marks the step where the person first gets a true, useful fact about their own thing. Time to first value is measured to here. |
| `bot_check` | bool | no | The step meets a bot check (Turnstile, reCAPTCHA, hCaptcha). The walker uses test keys on a local copy, a human-assisted step, or Navvi; see `knowledge/live-safety.md` §5. `captcha: true` is the legacy spelling. |
| `optional` | bool | no | If `true`, step failure doesn't block the walk |

## Actions Reference

- **navigate** — go to URL. Requires `url`.
- **click** — click element. Requires `selector`.
- **fill** — type into input. Requires `selector` + `value`.
- **select** — choose dropdown option. Requires `selector` + `value`.
- **scroll** — scroll to element or direction. Optional `selector` (scrolls to it) or `value` (`top`/`bottom`/`down`).
- **wait** — pause. Requires `value` (e.g. `2s`) or `selector` (wait until visible).
- **hover** — hover over element. Requires `selector`.

## Naming Convention

Flow names should read like RSpec `describe`/`it` blocks — self-explanatory to any LLM or human without project context. The name is a sentence describing the scenario, not a slug.

```yaml
# Bad — opaque without context
name: sign-up

# Good — you know the scenario from the name alone
name: New user signs up with email and password and lands on the dashboard
```

The filename should mirror the scenario: `new-user-signs-up-with-email-and-password.yml`.

The filename without `.yml` is the flow's **id**. Reports, diffs and pulse checks match walks by id, so keep it stable once a flow has been walked. If the `name` sentence changes, keep the file; if the file really must be renamed, list the old id under `previously`.

## Context Block

The `context` block documents preconditions for the scenario. Not executable (yet), but machine-readable and self-documenting. It tells you the starting state without reading the steps.

```yaml
context:
  user: new_account          # no prior account exists
  auth: logged_out           # user is not authenticated
  cart_items: 0              # empty cart
  plan: free                 # on free tier
  feature_flags:
    new_checkout: true       # experimental checkout enabled
```

Common context keys:
- `user` — account state (`new_account`, `existing`, `admin`, `invited`)
- `auth` — auth state (`logged_out`, `logged_in`, `expired_session`)
- `data` — data state (`empty`, `seeded`, `populated`)
- `plan` — subscription tier (`free`, `pro`, `enterprise`)
- `feature_flags` — any flags that affect the flow
- `browser` — browser constraints (`mobile`, `desktop`, `slow_network`)

You can use any keys that make sense for your project. The schema is intentionally open.

## Expect Evaluation

The `expect` field is a natural language description, not a code assertion. The AI evaluates it against the screenshot and DOM state after the step completes. Write rich, descriptive expectations that explain **why** the expected state matters.

Examples:
```yaml
# Minimal — works but misses intent
expect: form visible

# Rich — explains what a human would judge
expect: >
  Registration form is visible with email and password fields.
  No error messages shown. Submit button is enabled.

# With reasoning
expect: >
  Redirect to /dashboard because sign-up succeeded.
  Welcome banner shows the user's name, confirming the account was created.
```

## Variable Substitution

Use `$ENV_VAR` syntax for credentials and dynamic values:

```yaml
credentials:
  email: $TEST_EMAIL
  password: $TEST_PASSWORD

steps:
  - action: fill
    selector: "#email"
    value: $TEST_EMAIL
```

Variables are resolved from environment at walk time.

## i18n Locale Detection

The `locales` field tells flow-walk which locale prefixes are valid for this project. It is auto-populated by `/flowchad-setup` via `scripts/detect-i18n.sh` and should be updated whenever the site's i18n config changes (re-run `/flowchad-setup` to refresh).

### Detection priority (first match wins)

1. **Next.js** — `i18n.locales` array in `next.config.{js,mjs,ts,cjs}`
2. **locales/ or messages/ directories** — subdirectory names or top-level JSON/YAML filenames (used by next-intl, i18next, react-intl, etc.)
3. **Strapi** — i18n plugin detection (locales stored in DB; falls through to hreflang check)
4. **hreflang tags** — `<link rel="alternate" hreflang=...>` scraped from the production homepage URL in `config.yml`
5. **Default** — `[en]` (English only, no locale prefix)

### Behavior in flow-walk

- `locales: [en]` → test routes as-is (e.g., `/login`, `/signup`). **No `/en/` prefix.**
- `locales: [en, es]` → test both `/login` (en) and `/es/login` (es) variants.
- `locales: [en, es, fr]` → test three variants per locale-aware route.

Only routes that naturally include a locale prefix in the flow definition (e.g., `url: /es/login`) are affected. Routes already hardcoded with a locale are used as-is.

### Example

```yaml
# English-only site — no locale-prefixed routes generated
locales: [en]

# Multilingual site confirmed by next.config.js i18n block
locales: [en, es]

# Three-locale site detected from messages/ directory
locales: [en, es, fr]
```
