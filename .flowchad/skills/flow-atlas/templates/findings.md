# {Product} atlas: findings ({YYYY-MM-DD})

Companion to `index.html`. Every count below comes from the manifests.

## What was walked

- Today: {build} `{commit}`: {screens} screens, {actions} actions. {works} work,
  {untrue} have untrue text, {broken} are broken, {dead_end} are dead ends,
  {hidden} are hidden, {not_built} are not built, {needs_live_test} need a live test.
- After the open changes (only the screens they change): {screens} screens, {actions} actions.
  - {change or set}: {screens} screens. {conflicts, if any}
- Messages: {kinds} kinds; {per label}.
- Settings and stand-ins: {one line; the full list is under "Differences from production"}.

## 1. What stands between the owner and the value moment (walking order)

1. {What happens, in the words on screen}. Fix: {change, or "nobody is working on this"}. {Size} ({files}).
2. ...

## Done and working today

- {One line per thing that works end to end.}

## 2. Code health (production files holding a copy)

| Concept | {previous build} | today | after |
|---|---|---|---|
| {concept} | {n} | {n} | {n} |
| Unused exports | {n} | {n} | {n} |

Cleaned: {copies removed, or "none"}. Guarded only: {tests that stop growth}. Not touched: {concepts}.
Commands: `{command}`.

## 3. Compared with the previous atlas ({date})

| Count | previous | now |
|---|---|---|
| Works | {n} ({share}) | {n} ({share}) |
| Untrue text | {n} | {n} |
| Broken | {n} | {n} |
| Dead end | {n} | {n} |

## 4. Not walked

- {What}: {why}.

## 5. Differences from production

- {Each switch, stand-in or test key used, and why.}
