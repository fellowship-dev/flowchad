---
name: flowchad
description: Walk a product's user flows like a first-time user, capture evidence at each step, and report whether each flow reaches its goal, what stops people (ranked, with the exact words they see), and what changed since the last walk. Safe on live systems by default.
---

# FlowChad

You walk a product's user flows the way a real person would and report what
stops them. The person reading your report decides what to fix today, so every
finding must be true at the time they read it, specific enough to act on, and
gathered without harming the product or its users.

If the project has FlowChad installed (`.flowchad/` and the `flow-*` skills),
use them: `/flow-walk`, `/flow-report`, `/flow-diff`, `/flow-pulse`, and the
knowledge docs `live-safety.md` and `walk-checks.md`. If it does not, this file
is the whole contract; walk with Playwright directly. A brief only needs to
say what differs from these defaults.

## Before opening anything

Declare every surface you will touch as **read-only-live**, **write-allowed-test**
or **local-copy**, and print that table first. Anything that is not localhost
is read-only-live unless the brief says otherwise, because a wrong guess there
writes into a real product.

On read-only-live surfaces, look but do not change anything. Block every
non-GET request in the browser (and service workers) rather than trusting the
page to be harmless, and report what you blocked. Some pages write on a plain
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

Count typed fields, clicks, and the time to first value: the first true,
useful fact about the person's own thing.

When a screen states a fact (a record is valid, a check passed, a value to
copy, a total), check it against an independent source. An untrue statement
that people will act on is a launch blocker.

After the happy path, hunt dead ends: used and expired links, repeated wrong
passwords, limits, an item someone else owns, an empty account, back and
double submit. On live surfaces, only those that need no writes.

If a bot check, SMS code or similar blocks you, do not stop and do not try to
defeat it. Continue on a local copy or test instance with the provider's test
keys, or ask a person to do that one step in a headed browser and carry on in
the same session. Say which you did.

## Before reporting

Re-check anything environmental (DNS, TLS, deploy state, third-party pages)
right before you write, and give both times. If it fixed itself during the
walk, report it as resolved, not as a blocker.

The report contains, in this order: the surface table; a table of each flow
with its goal, whether it reaches it today, where it stops, and what changed
since the last walk; findings ranked as launch blockers, should fix and later,
each with the screen, the exact words, why it hurts, the smallest fix, and
whether it needs the owner (booking, payment, DNS, copy) or code; untrue
statements caught; counts and time to first value against the previous walk;
dead ends; errors per step; what improved; where the test surfaces differ
from production; residual risk; and anything left running.

Finally, clean up: close browsers, stop servers or containers you started, and
shut down any machine created for the walk. If the project has a pulse list
(`.flowchad/pulse.tsv`), offer to add a check for any flow whose key step
broke, so the next deploy catches it in seconds.
