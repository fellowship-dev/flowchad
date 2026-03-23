# Flow Definition YAML Schema

Every flow lives in `.flowchad/flows/*.yml`. One file per flow.

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable flow name |
| `url` | string | Starting URL (base or full) |
| `steps` | list | Ordered steps to execute |

## Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tags` | list | `[]` | Categorization tags for filtering |
| `priority` | enum | `P1` | `P0` (critical), `P1` (important), `P2` (nice-to-have) |
| `credentials` | map | `{}` | Env var references for auth (never hardcode) |
| `headed` | bool | `false` | Force headed browser (delegates to Navvi if available) |
| `video` | bool | `true` | Record video of the walk (requires ffmpeg for trimming) |
| `viewport` | map | `{width: 1280, height: 720}` | Browser viewport size |

## Step Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | yes | `navigate`, `click`, `fill`, `select`, `scroll`, `wait`, `hover` |
| `url` | string | for navigate | URL or path to navigate to |
| `selector` | string | for click/fill/select/hover | CSS selector for target element |
| `value` | string | for fill/select | Value to input or option to select |
| `expect` | string | no | Human-readable expectation (AI evaluates against screenshot) |
| `timing` | string | no | Max acceptable time (e.g. `2s`, `500ms`). Exceeding = friction |
| `captcha` | bool | no | If `true`, delegates to Navvi for headed execution |
| `optional` | bool | no | If `true`, step failure doesn't block the walk |

## Actions Reference

- **navigate** — go to URL. Requires `url`.
- **click** — click element. Requires `selector`.
- **fill** — type into input. Requires `selector` + `value`.
- **select** — choose dropdown option. Requires `selector` + `value`.
- **scroll** — scroll to element or direction. Optional `selector` (scrolls to it) or `value` (`top`/`bottom`/`down`).
- **wait** — pause. Requires `value` (e.g. `2s`) or `selector` (wait until visible).
- **hover** — hover over element. Requires `selector`.

## Expect Evaluation

The `expect` field is a natural language description, not a code assertion. The AI evaluates it against the screenshot and DOM state after the step completes.

Examples:
- `expect: form visible` — AI checks screenshot for a visible form
- `expect: redirect to /dashboard` — AI checks URL changed to /dashboard
- `expect: error message displayed` — AI looks for error UI
- `expect: cart shows 3 items` — AI reads cart count from screenshot

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
