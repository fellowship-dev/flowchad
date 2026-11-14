---
name: flow-pulse
description: Write and run a cheap after-deploy pulse — one plain HTTP check per flow's key step, matched on content, not just status. Usage /flow-pulse [init|run]
user_invocable: true
---

# Flow Pulse

A full walk is slow; a pulse takes seconds. After every deploy, check that the
key step of each flow still shows what the person came for. A pulse catches
the regressions that a status code hides: a booking page that returns `200`
and says "nothing available", a pricing page that lost its plans, a checker
that answers but with an error.

The pulse only sends `GET` requests, so it is safe against live systems as
long as no URL is a one-time or action link (see `flow-walk/references/live-safety.md`).
It is a script, not a CI job: run it by hand, from a deploy hook, or from any
scheduler you already have.

## Usage

```
/flow-pulse init    # write or refresh .flowchad/pulse.tsv from the flows
/flow-pulse run     # run it and summarise
```

## init: choose one check per flow

For each flow in `.flowchad/flows/`, pick the step that proves the flow can
reach its goal (usually the `first_value` step, or the first screen that needs
real content) and write one line to `.flowchad/pulse.tsv`:

```
# flow-id<TAB>url<TAB>must-contain<TAB>must-not-contain
book-a-call	https://example.com/book	Choose a time	No booking types
pricing-page	https://example.com/pricing	per month
public-checker	https://example.com/api/check?domain=example.com	"status":"ok"	"status":"error"
```

Matching is a plain substring search on the **raw response body** as served
(HTML source or JSON text), not on the rendered page. Pick strings that only
occur in the outcome you mean: `"error"` would also match `"error":null` in a
healthy JSON reply.

- `must-contain` is a fixed string that only appears when the step works.
  `must-not-contain` is a known failure text, such as an empty state.
- A plain GET sees server-rendered HTML only. If the page renders on the
  client, point the check at the public JSON endpoint the page reads from, or
  at a server-rendered page further along. If neither exists, leave the flow
  out and say so: that flow needs a browser walk.
- Never include URLs that write on GET, carry tokens, or need a signed-in
  session.
- Keep flow ids identical to the flow filenames so pulse results line up with
  walk reports.

Commit `pulse.tsv` with the flows.

## run

```bash
PULSE=$(ls .flowchad/skills/flow-pulse/scripts/pulse.sh \
           .claude/skills/flow-pulse/scripts/pulse.sh \
           .agents/skills/flow-pulse/scripts/pulse.sh 2>/dev/null | head -1)
bash "$PULSE" .flowchad/pulse.tsv
```

Each line is timestamped in UTC (`PASS` or `FAIL` with the reason) and shows
the final URL after redirects, so a redirect to a sign-in page is visible.
Only `http` and `https` are allowed, for the request and for redirects.

| Exit | Meaning |
|---|---|
| `0` | every check passed |
| `1` | at least one check failed (HTTP status, curl error such as a timeout, missing or forbidden text) |
| `2` | usage error: no checks file, a line without a URL or with more than four fields, or no checks at all |

A deploy hook should alert on any non-zero exit.

Report the failures with their timestamps. A failure on a third-party host or
on DNS is environmental: re-run once before calling it a regression, and say
when it was first and last seen.
