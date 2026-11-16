<!-- prefix: AGENT -->
# Agent experience

More and more of a product's first users are agents acting for a person:
reading its docs, running its CLI, calling its API or tools. These rules are
walked by a fresh agent the same way as docs (see `docs-cold-start.md`), and
by reading the CLI help, the API reference and tool descriptions it would
use.

### AGENT-01 · Docs an agent can read

- **Rule:** The product serves machine-readable docs (for example `/llms.txt`) with a short summary and links to plain-text or Markdown versions of the pages an agent needs, and those pages open without an account.
- **Check:** Fetch the machine-readable index (for example `/llms.txt`) and each linked page without cookies. Fail if there is none, it has no summary, it links to pages that need a sign-in or render only with scripts, or it omits the install and first-value pages.
- **Severity:** later
- **Applies to:** agent, docs
- **Basis:** source — Jeremy Howard, "The /llms.txt file" (2024, revised 2026, a proposal, not a standard), <https://llmstxt.org/> (checked 2026-11-15): the file itself, "A proposal to standardise on using an /llms.txt file to provide information to help agents use a website", with a heading, a short summary and links to Markdown versions of pages.
- **Basis:** source — Mathias Biilmann, "Introducing AX: Why Agent Experience Matters" (2025), <https://biilmann.blog/articles/introducing-ax/> (checked 2026-11-15): the agent-experience idea only, not the file format; "Are there machine-ready documentation and context for LLMs and agents to properly use the available platform and SDKs?"
- **Pass:** `/llms.txt` lists "Install", "First result" and "API reference", each linking to a `.md` page that fetches without a session.
- **Fail:** No machine-readable index such as `/llms.txt`, and the docs pages return an empty shell until scripts run in a signed-in browser.
- **Since:** 0.5.0

### AGENT-02 · Access through one standard, documented flow

- **Rule:** An agent gets access on a person's behalf through a standard authorization flow or a credential it reads from its environment, in which the person only signs in and approves, and the docs describe it on one page.
- **Check:** From the docs, find how an agent gets access and list what the person must do themselves, apart from what the agent or its client does. Fail if the person must do more than sign in and approve (for example ask support for a key, or copy values between settings pages), if access is described across several pages, or if it is not described.
- **Severity:** should-fix
- **Applies to:** agent
- **Basis:** source — Mathias Biilmann, "Introducing AX: Why Agent Experience Matters" (2025), <https://biilmann.blog/articles/introducing-ax/> (checked 2026-11-15): "Is it simple for an Agent to get access to operating a platform on behalf of a user?"
- **Basis:** source — Model Context Protocol, Specification 2026-07-28, "Authorization", <https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization> (checked 2026-11-15): authorization enables clients "to make requests to restricted MCP servers on behalf of resource owners"; over HTTP the client runs one OAuth 2.1 based flow that opens the person's browser to approve, and "Implementations using an STDIO transport SHOULD NOT follow this specification, and instead retrieve credentials from the environment."
- **Pass:** "Run `tool login`, approve in the browser, done" on the one page about agents.
- **Fail:** Access needs a support request for an API key, then a separate settings page to scope it, each described on a different page.
- **Since:** 0.5.0

### AGENT-03 · No command requires a prompt

- **Rule:** Every command an agent must run accepts its input as flags or arguments and never requires an interactive prompt.
- **Check:** Run each install and first-value command with no terminal attached (stdin closed). Fail any that waits for input, or that has no flag for a value it prompts for.
- **Severity:** should-fix
- **Applies to:** agent, docs
- **Basis:** source — Command Line Interface Guidelines, <https://clig.dev/> (checked 2026-11-15): "Never require a prompt. Always provide a way of passing input with flags or arguments." If stdin is not an interactive terminal, skip prompting.
- **Pass:** `tool init --name demo --region eu --yes` runs to completion in a script.
- **Fail:** `tool init` asks three questions interactively and has no flags for them.
- **Since:** 0.5.0

### AGENT-04 · Errors and exit codes an agent can act on

- **Rule:** A command or API error names the cause and the next command or parameter that fixes it, and commands exit non-zero exactly when they fail.
- **Check:** Trigger the common failures (missing token, wrong argument, unavailable feature). Quote each message and record the exit code. Fail a message with no cause or fix, or a failure that exits 0.
- **Severity:** should-fix
- **Applies to:** agent
- **Basis:** source — Command Line Interface Guidelines, <https://clig.dev/> (checked 2026-11-15): "Return zero exit code on success, non-zero on failure", and suggest what to do when there is an error.
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 9, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): error messages "precisely indicate the problem, and constructively suggest a solution."
- **Threshold source:** <https://clig.dev/> (checked 2026-11-15): exit code zero on success and non-zero on failure.
- **Pass:** `error: no token found; run "tool login" or set API_TOKEN` and exit code 1.
- **Fail:** A stack trace and exit code 0, or an API response of `{"error":"E4011"}`.
- **Since:** 0.5.0
