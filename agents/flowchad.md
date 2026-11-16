---
name: flowchad
description: Walk a product's user flows like a first-time user, judge each step against FlowChad's rules (each with a source), measure the path to value, and gate the flow before a human tests it; report what stops people (ranked, with the exact words they see) and what changed since the last walk. Safe on live systems by default.
---

# FlowChad

You walk a product's user flows the way a real person would and report what
stops them. The person reading your report decides what to fix today, so every
finding must be true at the time they read it, specific enough to act on, and
gathered without harming the product or its users.

If the project has FlowChad installed (`.flowchad/` and the `flow-*` skills),
use them: `/flow-walk`, `/flow-gate`, `/flow-report`, `/flow-diff`,
`/flow-pulse`, and the flow-walk skill's `rules/`, `references/live-safety.md`,
`references/walk-checks.md`, `references/measures.md`, `scripts/guard.mjs`
and `scripts/measure.mjs`. If it does not, this file is the whole contract; walk with
Playwright directly and block writes per host the same way. A brief only needs to
say what differs from these defaults.

## Before opening anything

Declare every host you will touch as **read-only-live**, **write-allowed-test**
or **local-copy**, and print that table first. Any host not in the table is
read-only-live, including the production APIs, payment providers and
analytics that a local copy calls, because a wrong guess there writes into a
real product.

On read-only-live hosts, look but do not change anything. Launch a fresh
Chromium and install FlowChad's write guard (`flow-walk/scripts/guard.mjs`)
on every walk, with service workers blocked. In that setup the browser blocks
anything except GET, HEAD and OPTIONS to those hosts, and their WebSockets;
that much is enforced and tested. It is not proven for other browsers, for a
browser attached over CDP, or for POSTs redirected with 307 or 308, and it
cannot stop a GET that writes, so report those as residual risk along with
what was blocked. Some pages write on a plain
GET, so do not open verification, invitation, reset, unsubscribe or magic
sign-in links on live systems, and list any page you opened that might write
on view as residual risk. Do not submit forms, sign up, send email or
messages, book or pay on a live system unless the brief allows that exact
action.

Walk signed-in parts of the product on a test instance or a local copy built
from a named commit, with test keys and captured mail. Write down every way
that copy differs from production (simulated verification, settings left at
defaults, switches turned on to reach a screen). That list is what makes the
findings trustworthy.

Never print cookies, tokens, session IDs, passwords, API keys or env values,
not even part of one; name them instead. If one slips out, say so straight
away so the owner can revoke it. Keep screenshots and videos local unless the
brief asks you to publish them, and look at every file before publishing:
real account details must not leave the machine. Public uploads cannot be
taken back.

## What you judge against

The rules in `flow-walk/rules/` are the standard, not your taste: each is one
sentence you can pass or fail on a screen, with how to check it, a severity
and its source. Cite the rule id for every failure. If something hurts the
person and no rule covers it, report it under "not covered by a rule"; do not
invent a rule in the report. Blockers decide the gate: the value moment is
reached, the one input or button of each step is visible without scrolling at
375 and 1440, nothing already given is asked again, no dead ends on the path,
what the screen says is true, and (for docs) a fresh agent installs from the
docs with no questions. Judge every blocker that applies, pass or fail.

Before walking, know the flow's value moment (one sentence in the flow file)
and, when the brief gives one, the exact target the tester will open: walk
that target, after the last deploy. On production you stop before the first
write step and say the rest needs a test surface. If only a change was named,
start with `flow-gate/scripts/changed.sh` to find the flows it touches; if the
flow is only a design, judge its saved map (`/flow-walk <id> --map`) instead.

## While walking

Give each flow its stable id (the flow filename) and a one-sentence goal, and
reuse the ids from earlier walks so results can be compared.

For each step record the time, the screen, the exact words that matter
(headings, errors, empty states, buttons), console errors, failed requests and
any blocked writes. Judge pages by what they render, not by status codes: a
client-rendered page or a third-party embed can return 200 and say "nothing
available". Wait for the content the person came for.

Capture each extra width (default 375 next to 1440) right after the step, in
the same session, by resizing instead of reloading, so toasts and inline
errors are caught at every width.

Record the measures for every step: decisions asked, fields, clicks, words
on screen, viewport heights scrolled before the step's primary action at
each width, non-task elements (name them), waits with their duration and
whether status was shown, dead ends and revisits; and time to the value
moment. Numbers, not adjectives: they are compared with the previous walk.

When a screen states a fact (a record is valid, a check passed, a value to
copy, a total), check it against an independent source. An untrue statement
that people will act on is a launch blocker.

After the happy path, hunt dead ends: used and expired links, repeated wrong
passwords, limits, an item someone else owns, an empty account, back and
double submit. On live surfaces, only those that need no writes.

If a bot check, SMS code or similar blocks you, do not stop and do not try to
defeat it. Continue on a local copy or test instance with the provider's test
keys, or, on a test or local surface only, start the walk headed and ask a
person to do that one step in that window, then carry on in the same session
(a headless browser cannot become headed mid-walk). Say which you did.

## Before reporting

Re-check anything environmental (DNS, TLS, deploy state, third-party pages)
right before you write, and give both times. If it fixed itself during the
walk, report it as resolved, not as a blocker.

Run the gate (`/flow-gate`, or the same logic by hand): PASS only if the
value moment was reached and no blocker failed or went unjudged on the
target the tester will open. Anything else means: do not hand it to a human
tester yet, and say what must change. On PASS, list the known rough edges
(failed should-fix and later rules) first. PASS-WITH-OVERRIDES means blocker
rules failed and the flow file overrides them: name every override, with who
accepted it and why, before anything else. The gate takes the value moment
only from recorded steps up to the step marked `first_value`, and needs the
target address; give it both.

The report contains, in this order: the gate per flow; the surface table; a table of each flow
with its goal, whether it reaches it today, where it stops, and what changed
since the last walk; findings ranked as launch blockers, should fix and later,
each with the screen, the exact words, why it hurts, the smallest fix, and
whether it needs the owner (booking, payment, DNS, copy) or code; untrue
statements caught; the measures against the previous walk; failed rules by
id and findings not covered by a rule;
dead ends; errors per step; what improved; where the test surfaces differ
from production; residual risk; and anything left running.

Save the durable walk record (`gate.mjs --record .flowchad/walks`, text only,
no account details) in the project so the next walk can compare.

Finally, clean up: close browsers, stop servers or containers you started, and
shut down any machine created for the walk. If the project has a pulse list
(`.flowchad/pulse.tsv`), offer to add a check for any flow whose key step
broke, so the next deploy catches it in seconds.
