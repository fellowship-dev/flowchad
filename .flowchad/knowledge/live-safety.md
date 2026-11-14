# Live Safety

A walk is useful only if it leaves the product, its users and the person who
asked for it unharmed. This contract applies to every walk, so a brief does not
have to repeat it. A brief can widen it explicitly ("you may submit the contact
form on staging"); silence never widens it.

## 1. Declare every surface before walking

Write a surface table at the top of the walk (it is copied into `results.json`
and the report). Each surface is one of:

| Mode | Meaning | What the walker may do |
|---|---|---|
| `read-only-live` | Production or anything real people use | Look, click links, scroll, type into fields without submitting. No writes. |
| `write-allowed-test` | A staging or test instance the brief names as writable | Create test accounts and data, submit forms, receive captured mail. Never real payments or real recipients. |
| `local-copy` | The product built locally from a named commit, with test keys and captured mail | Anything, including resetting data. |

If the brief or `config.yml` does not say, treat any URL that is not localhost
as `read-only-live`. Production is never `write-allowed-test` unless the brief
says so in those words.

For a `local-copy`, record the commit it was built from and list every way it
differs from production (simulated verification, settings left at defaults,
feature switches turned on to reach a screen, test keys, captured mail). That
list goes in the report's "Where this differs from production" section; it is
what makes local findings trustworthy.

## 2. Read-only must be verified, not assumed

On a `read-only-live` surface:

- **Block unsafe methods in the browser.** Route every request and abort any
  `POST`, `PUT`, `PATCH` or `DELETE` before it leaves the browser, first- or
  third-party (analytics beacons included: a walk should not pollute the
  product's numbers either). Record each blocked request with its method, host
  and path. A blocked request on a step means that step would have written;
  report it and do not try to work around the block. Block service workers
  too, since their requests bypass the guard; anything else the guard cannot
  see (WebSocket messages, for example) belongs under "Residual risk".
- **Know that a GET can write.** Some pages store something when viewed (a
  check that saves its result, a "verify" or "refresh" page, view counters,
  tracking redirects). Do not open one-time or action links on live systems:
  email verification, magic sign-in, invitation acceptance, password reset,
  unsubscribe, "confirm" links. For every page you did open that might write on
  view, name it under "Residual risk" in the report.
- **Never submit, send or book.** No form submissions, sign-ups, emails,
  messages, bookings, payments or uploads on live systems unless the brief
  allows that specific action on that specific surface.

Flow steps that write carry `effect: write` (or `send`, `pay`). On a
`read-only-live` surface the walker stops the flow before such a step, records
"stopped before a write step (surface is read-only-live)" and continues with
the next flow. The rest of that flow is walked on a test instance or local copy.

## 3. Secrets never appear in output

Never print cookies, session IDs, bearer tokens, API keys, passwords, one-time
codes, or the values of environment variables, not even partially. Refer to
them by name (`$TEST_PASSWORD`, "the session cookie"). Do not dump storage
state, request headers or full network logs to the transcript; summarise them.
If a secret is printed by accident, say so at once so the owner can revoke it
(for a session: sign it out), and do not reuse it.

Use a fresh browser context for every walk. Connecting to an existing browser
over CDP is fine, but never reuse its signed-in tabs or cookies for a live walk.

## 4. Evidence is private by default

Screenshots, videos and GIFs stay in `.flowchad/snapshots/` (git-ignored)
unless the brief or `config.yml` asks for publishing. Before publishing any
file, look at it: it must not show real account details (emails, names,
domains, addresses, balances), tokens, or customer data. Prefer test accounts
for anything you will share; crop or redact otherwise. The public evidence
bucket is readable by anyone with the URL and its upload key cannot delete, so
a mistake there cannot be undone by the walker.

## 5. Bot checks and other blockers: proceed, don't stop

A headless browser will usually fail Turnstile, reCAPTCHA, hCaptcha and
similar checks on live sites. Do not stop the walk and do not try to defeat the
check. Pick one, in this order, and record which:

1. **Local copy or test instance with the provider's test keys.** The common
   providers publish site and secret keys that always pass; the rest of the
   flow then runs normally.
2. **Human-assisted step.** Open a headed browser, ask the person to pass the
   check (or do the sign-in) in that window, then continue the walk in the
   same session. Mark the step `human_assisted: true`.
3. **Navvi** (headed automation), if the project has it configured.

The same applies to SMS codes, payment confirmations and other steps the
walker cannot do alone: route around them on a test surface, or hand that one
step to a person.

## 6. Clean up

Close browsers and contexts, stop any local servers or containers the walk
started, remove test accounts created on shared test instances when the brief
asks, and shut down any machine created for the walk. The report ends with
what was left running, if anything, and why.
