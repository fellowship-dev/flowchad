---
name: flow-diagram
description: Generate mermaid flowcharts from YAML flow definitions — visualize happy path, error paths, and decision points. Usage /flow-diagram <flow-name>
user_invocable: true
---

# Flow Diagram

Generate a mermaid flowchart from a flow definition YAML.

## Usage

```
/flow-diagram sign-up
/flow-diagram all          # diagram all flows
```

## Process

### 1. Load Flow

Read `.flowchad/flows/{name}.yml`. Parse steps.

### 2. Build Mermaid Graph

Map each step to a node. Connect sequentially. Add error/alternate paths based on `expect` and `optional` fields.

**Node shapes by action:**
- `navigate` → stadium `([Navigate to /signup])`
- `fill` / `select` → parallelogram `[/Fill #email/]`
- `click` → rectangle `[Click submit]`
- `wait` → circle `((Wait 2s))`
- `hover` / `scroll` → rectangle `[Hover .menu]`

**Edge labels:**
- Steps with `expect` get a success/failure branch
- Steps with `optional: true` get a skip path
- Steps with `captcha: true` get a "→ Navvi" delegation edge

### 3. Generate Output

```mermaid
graph TD
    A([Navigate to /signup]) --> B[/Fill #email/]
    B --> C[/Fill #password/]
    C --> D[Click submit]
    D -->|Success| E([Dashboard])
    D -->|Error| F[Error message]
    F --> C
```

### 4. Add Timing Annotations

If the flow has been walked (snapshot exists), annotate nodes with actual timing:

```mermaid
graph TD
    A([Navigate /signup<br/>1.2s]) --> B[/Fill #email<br/>0.15s/]
    B --> C[/Fill #password<br/>0.12s/]
    C --> D[Click submit<br/>2.8s ⚠️]
    D -->|pass| E([Dashboard])
    D -->|fail| F[Error]
```

### 5. Color Coding (from walk results)

If walk results exist, color nodes by status:
- Pass → default (no style)
- Fail → `style N fill:#f96,stroke:#c33`
- Slow → `style N fill:#ff9,stroke:#cc6`
- Skipped → `style N fill:#ddd,stroke:#999`

### 6. Present Output

Print the mermaid source in a fenced code block. The user can:
- Paste into any mermaid renderer (GitHub, Obsidian, mermaid.live)
- Use `mmdc` CLI to render to PNG/SVG if installed

If multiple flows requested (`all`), generate one diagram per flow with a heading.

## Multi-Flow Overview

When `all` is specified, also generate an overview diagram showing how flows connect:

```mermaid
graph LR
    SignUp --> Login
    Login --> Dashboard
    Dashboard --> Settings
    Dashboard --> Checkout
    Checkout --> Confirmation
```

Derive connections from shared URLs/pages across flows (e.g., sign-up ends at /dashboard, login ends at /dashboard → they converge).
