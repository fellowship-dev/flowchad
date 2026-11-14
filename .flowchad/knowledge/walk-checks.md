# Walk Checks

Techniques that turn a walk from "the pages load" into "a person reaches their
goal, and what the product told them was true". `/flow-walk` applies all of
them by default; `/flow-report` relies on the data they produce.

## Judge rendered content, not status codes

A `200` only says the server answered. Client-rendered pages and third-party
embeds (booking, scheduling, payment, chat, maps, docs widgets) can return
`200` and still show "nothing available", a spinner forever, or an error
inside an iframe. After each navigation, wait for the content the person came
for (the `expect` text, a list with at least one item, the form itself), not
just for `load`. Read the words on screen, including inside iframes, and judge
the step by them. An empty state where the goal needs content is a failed
step, not a pass.

## Timestamp every observation

Each step result carries `observed_at` (ISO 8601 with offset). Facts about the
environment (DNS, TLS, redirects, a third-party page, whether a deploy has
finished) change while you work, sometimes because the owner is fixing them
during the walk. Record each environmental check with its time in
`environment_checks`. Right before writing the report, re-check every
environmental finding and report both times; if it changed, say "resolved
during the walk" instead of reporting a blocker that no longer exists.

## Capture every width at the same moment

Short-lived states (toasts, inline validation errors, loading states, menus)
exist only at the moment they happen. Reloading the page at another width
loses them. After each step, take the default screenshot, then resize the same
page to each extra width, screenshot, and restore the size, without
navigating. Default widths: 1440 and 375. Name files
`step-03-click@375.png`.

## Count the effort and the time to first value

Per flow, count fields the person typed into, clicks or taps, and the time
from first landing to **first value**: the first true, useful fact about the
person's own thing (their score, their record, their result), not a
marketing claim or a loading screen. Mark that step with `first_value: true`
in the flow. Compare all three with the previous walk of the same flow.

## Cross-check what the product claims

When a screen states a fact, check it against an independent source before
accepting it: a DNS lookup, a second tool, the spec, the database of a local
copy, or arithmetic. Typical catches: a suggested configuration that would
break something if applied, a checker calling a valid input broken (or the
reverse), a summary that says "checked" or "sent" when nothing happened, a
total that does not add up. An untrue statement is at least a should-fix and
usually a launch blocker, because people act on it.

Record each cross-check in the step result (`truth_checks`): the claim, the
independent fact, and whether they agree.

## Record console and network errors per step

Attach to every step: console errors and uncaught exceptions, failed requests
(network errors and HTTP status 400 or above) with method, host, path and
status, and on `read-only-live` surfaces the unsafe requests that were
blocked. Keep paths, drop query strings that may carry tokens. A step that
"looks fine" but logs errors is worth a line in the report.

## Hunt dead ends after the happy path

When the happy path is done, spend a short pass on the ways people get stuck.
On `read-only-live` surfaces only try the ones that need no writes.

- Expired, already-used and malformed links (verification, invitation, reset).
- Wrong password several times in a row; lockout and its message.
- Limits: plan caps, rate limits, file size, long input, empty input.
- An item someone else owns (another account's URL or ID).
- A brand-new, empty account: does every screen say what to do next?
- Back button, refresh mid-flow, double submit, opening a link in a new tab.

Report each dead end with the exact words the person sees and whether they can
recover without help.
