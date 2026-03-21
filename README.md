# Flowchad

Drop-in AI QA and UX auditor for any web project. Walks your user flows, screenshots each step, times transitions, and produces friction reports with improvement suggestions.

No CLI. No npm. Just clone and go.

## Install

```bash
cd your-project
git clone https://github.com/Fellowship-dev/flowchad.git .flowchad
```

Or copy the `.flowchad/` directory into your project root.

## Structure

```
.flowchad/
├── skills/          # AI skills (setup, walk, report, suggest, etc.)
├── commands/        # Slash commands for Claude Code
├── agents/          # Agent definitions
├── knowledge/       # Reference docs (friction taxonomy, metrics, etc.)
├── templates/       # Flow templates (sign-up, login, checkout, etc.)
├── flows/           # Your project's flow definitions (YAML)
├── snapshots/       # Walk results + screenshots (gitignored)
├── reports/         # Generated friction reports (gitignored)
└── config.yml       # Project-level configuration
```

## Quick Start

1. Clone into your project (see above)
2. Edit `config.yml` with your project URL and credentials
3. Define flows in `flows/*.yml` (or run the setup skill to auto-discover)
4. Walk a flow: `/flow-walk sign-up`
5. Get a report: `/flow-report sign-up`

## Flow Definition

```yaml
name: sign-up
url: https://staging.example.com/signup
tags: [onboarding, critical]
priority: P0
steps:
  - action: navigate
    url: /signup
    expect: form visible
    timing: 2s
  - action: fill
    selector: "#email"
    value: $TEST_EMAIL
  - action: click
    selector: "button[type=submit]"
    expect: redirect to /dashboard
    timing: 3s
```

## How It Works

- **Walk**: Playwright CDP executes your flow step-by-step, capturing screenshots and timing
- **Report**: AI categorizes findings as Critical / Friction / Cosmetic
- **Suggest**: Prioritized improvements ranked by effort vs impact
- **Diff**: Compare runs to detect regressions over time
- **Diagram**: Mermaid flowcharts from your YAML definitions

## Requirements

- [Claude Code](https://claude.ai/claude-code) (runtime)
- Chromium or Chrome (for Playwright CDP)

## License

MIT
