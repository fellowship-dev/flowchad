<!-- prefix: AGENT -->
# Agent experience

More and more of a product's first users are agents acting for a person:
reading its docs, running its CLI, calling its API or tools. These rules are
walked by a fresh agent the same way as docs (see `docs-cold-start.md`), and
by reading the CLI help, the API reference and tool descriptions it would
use.

### AGENT-01 · Docs an agent can read

- **Rule:** The product serves `/llms.txt` with a one-line summary and links to Markdown versions of the pages an agent needs, and those pages open without an account.
- **Check:** Fetch `/llms.txt` and each linked page without cookies. Fail if the file is missing, has no summary line, links to pages that need a sign-in or render only with scripts, or omits the install and first-value pages.
- **Severity:** should-fix
- **Applies to:** agent, docs
- **Basis:** source — Jeremy Howard, "The /llms.txt file" proposal (2024), <https://llmstxt.org/>: an H1, a one-line summary and links to clean Markdown versions of the pages agents need.
- **Basis:** source — Mathias Biilmann, "Introducing AX: Why Agent Experience Matters" (2025), <https://biilmann.blog/articles/introducing-ax/>: agents need open access to documentation and clean, well-described interfaces.
- **Pass:** `/llms.txt` lists "Install", "First result" and "API reference", each linking to a `.md` page that fetches without a session.
- **Fail:** No `/llms.txt`, and the docs pages return an empty shell until scripts run in a signed-in browser.
- **Since:** 0.5.0

### AGENT-02 · Access in one documented step

- **Rule:** An agent can get access on a person's behalf through one documented step, such as a CLI login, a scoped token or a standard authorization flow, described in one place.
- **Check:** From the docs, find how an agent gets access. Count the steps and the pages needed to learn them. Fail if access needs more than one step by the person, is described on more than one page, or is not described.
- **Severity:** should-fix
- **Applies to:** agent
- **Basis:** source — Mathias Biilmann, "Introducing AX: Why Agent Experience Matters" (2025), <https://biilmann.blog/articles/introducing-ax/>: is it simple for an agent to get access to operate a platform on behalf of a person?
- **Basis:** source — Model Context Protocol, "Specification", Authorization, <https://modelcontextprotocol.io/specification>: a standard authorization flow lets a client act for a person with their consent.
- **Pass:** "Run `tool login`, approve in the browser, done" on the one page about agents.
- **Fail:** Access needs a support request for an API key, then a separate settings page to scope it, each described on a different page.
- **Since:** 0.5.0

### AGENT-03 · No command requires a prompt

- **Rule:** Every command an agent must run accepts its input as flags or arguments and never requires an interactive prompt.
- **Check:** Run each install and first-value command with no terminal attached (stdin closed). Fail any that waits for input, or that has no flag for a value it prompts for.
- **Severity:** should-fix
- **Applies to:** agent, docs
- **Basis:** source — Command Line Interface Guidelines, <https://clig.dev/>: never require a prompt; always provide a way of passing input with flags or arguments, and do not prompt when stdin is not interactive.
- **Pass:** `tool init --name demo --region eu --yes` runs to completion in a script.
- **Fail:** `tool init` asks three questions interactively and has no flags for them.
- **Since:** 0.5.0

### AGENT-04 · Errors and exit codes an agent can act on

- **Rule:** A command or API error names the cause and the next command or parameter that fixes it, and commands exit non-zero exactly when they fail.
- **Check:** Trigger the common failures (missing token, wrong argument, unavailable feature). Quote each message and record the exit code. Fail a message with no cause or fix, or a failure that exits 0.
- **Severity:** should-fix
- **Applies to:** agent
- **Basis:** source — Command Line Interface Guidelines, <https://clig.dev/>: return zero on success and non-zero on failure; suggest what to do when there is an error.
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 9, <https://www.nngroup.com/articles/ten-usability-heuristics/>: error messages state the problem and suggest a solution.
- **Pass:** `error: no token found; run "tool login" or set API_TOKEN` and exit code 1.
- **Fail:** A stack trace and exit code 0, or an API response of `{"error":"E4011"}`.
- **Since:** 0.5.0
