---
name: flow-atlas
description: Map the whole product — every screen and every action, inventoried from the code and walked for real, one label per action with evidence, today versus after the open changes, blockers in walking order and code health measured with the repo's own scanners. Usage /flow-atlas [--after <ref>...]
user_invocable: true
---

# Flow Atlas

A flow walk answers "does this path reach its goal?". An atlas answers "what
works in this product today, and what stands between its owner and using it?"
It covers every screen and every action, not the saved flows only, so it is
the document to read before the owner dogfoods the product, before the first
ask for payment, and after a long run of merges.

An atlas reports what was walked and measured. It is never a plan: a screen
that was not walked is listed as not walked, a count that was not measured is
not given, and an action is never labelled from reading the code alone when it
could be clicked.

## Usage

```
/flow-atlas                                   # the deployed build only
/flow-atlas --after 412 --after 415           # plus the open changes 412 and 415
/flow-atlas --after 412+415 --after 418       # 412 and 415 together (they ship together), 418 alone
```

A `--after` value is a change (pull request number or branch) or a `+`-joined
set walked as one integrated build. Changes that conflict are walked
separately; say so and name the conflicting files.

## Safety

Every walk follows `flow-walk/references/live-safety.md`. The default is to
walk **local copies** built from named commits, with the production settings
(names and non-secret values only) and stand-ins for every outside provider:
captured mail, a fake payment provider in test mode, fake DNS and identity
providers, the repo's own test fixtures. Production is `read-only-live`: at
most unauthenticated GETs of public pages, for comparison. Never send real
mail, never pay, never write real DNS, never use production credentials.

Anything only the real provider can prove gets the label **Needs live test**
with what that test needs (an account, a key, a real message), never Works.

Before writing any output, keep it out of commits (screens can show
signed-in data):

```bash
touch .flowchad/.gitignore
grep -qxF "atlas/" .flowchad/.gitignore || echo "atlas/" >> .flowchad/.gitignore
```

## The seven labels

Every action gets exactly one. The evidence column is required.

| Label | Code | Means | Evidence |
|---|---|---|---|
| Works | `WORKS` | You did it and saw the right result. | What you saw (the screen, the stored row, the captured message). |
| Untrue text | `UNTRUE` | It works, but a sentence on screen is false for this state. | The sentence quoted, and what is true. |
| Broken | `BROKEN` | It fails or does something other than it says. | What happened instead; `file:line` when found. |
| Dead end | `DEAD_END` | The person cannot go forward or back from here. | The screen and what is missing. |
| Hidden | `HIDDEN` | It exists in the code but this deployment cannot reach it. | Why (`file:line` of the switch or check). |
| Not built | `NOT_BUILT` | The product says or implies it exists, or the path needs it, and there is no code. | Where it is promised or needed. |
| Needs live test | `NEEDS_LIVE_TEST` | Only a real outside service can show whether it works. | What a live test needs. |

An action is any button, link, form, toggle, menu item, copy button,
destructive action or navigation item. If the same action behaves differently
per role, label it once per role.

## Method

### 1. Inventory from the code

Before opening a browser, list what exists:

- every route and page, with the roles that can reach it and the switches that
  hide it (read the router, the server routes and the feature checks);
- every action on each page;
- every message the product sends (email, notification, webhook) and its
  trigger;
- every scheduled job and what it changes in a person's data;
- every switch and setting, with its value in production.

Group the screens into **paths** in walking order, from a first-time visitor
to the value moment and on to the edges. A typical lettering: A public site;
B sign up and sign in; C first setup; D the core value screens; E acting on
what the product found; F extras; G messages the product sends; H team;
I workspaces or accounts; J settings, keys and agent access; K buying;
L operator or admin area; M scheduled jobs; N error and empty states. Use
the product's own words for screen titles.

The inventory is the denominator. Whatever is in it and not walked goes under
**Not walked** with the reason.

### 2. Builds and seed data

- **Today:** the commit that production runs, with production's settings.
- **After:** each `--after` build. Walk only the screens its changes touch,
  and say which.
- Record for each build the commit, the settings used and every difference
  from production (switches turned on to reach a screen, stand-ins, test keys).
- Seed one realistic person and organization through the real routes (sign
  up, verify, add the first object, receive data through the real intake),
  plus a second person for invitations. Seed directly in the database only
  where the real route cannot complete locally, and say so. Use made-up names
  and reserved domains (`example.com`, `*.test`).

Walk several builds in parallel when you can, one isolated machine per build.

### 3. Walk every action

For each screen, in path order and for each role that can reach it:

1. Screenshot every distinct screen and state: 375 px wide always; 1440 px for
   dense pages (dashboards, detail pages, settings). JPEG, quality about 70,
   at most 1,800 CSS px tall, each under 400 KB. Name files
   `<build>-<path>-<NN>-<slug>-<width>.jpg`.
2. Do every action and label it with evidence. For a destructive action, do it
   on seeded data and record what it removed.
3. Render every message the product sends with realistic data (600 px wide)
   and keep its plain text.
4. Run every scheduled job by direct invocation and record the rows it
   changed and whether it is switched on in production.

Write the build's manifest as you go (valid JSON at every save) so a partial
result is usable. Schema: `templates/manifest.example.json`.

### 4. Ordered blockers

From the labels, write the list of what stands between the owner (or the
first customer) and the value moment, **in walking order**: the first thing a
person meets comes first. For each blocker:

- what happens, in the words on screen;
- the fix in flight (the change that removes it, checked against the "after"
  walk) or "nobody is working on this";
- a size (small, medium, large) and the files involved.

An open change that does not remove its blocker in the "after" walk is
reported as such.

### 5. Code health, measured

Use the repo's own scanners first: its single-source or duplication guards,
its unused-export, dead-code and skipped-test checks. Where it has a list of
concepts that must have one implementation, count, for each concept and each
build, the production files holding a copy. Add unused exports, dead pages,
skipped tests and TODO/FIXME counts. Show every command you ran.

State plainly what was **cleaned** (copies removed) versus only **guarded**
(a test that stops growth). If the repo has no such list, name the concepts
you counted and how; do not invent a score.

### 6. Write the output

In `.flowchad/atlas/{YYYY-MM-DD}/`:

```
.flowchad/atlas/2026-03-20/
├── index.html          # the page (format below)
├── findings.md         # templates/findings.md, filled in
├── manifests/<build>.json
├── code-health.json    # per build: concept → files
└── shots/*.jpg
```

Every count in the page and the findings comes from the manifests by a
command, never typed by hand. For example, actions by label:

```bash
node -e 'const m=require(process.argv[1]);const c={};for(const s of m.screens)for(const a of s.actions)c[a.status]=(c[a.status]||0)+1;console.log(c)' ./manifests/today.json
```

### 7. The page

One self-contained HTML page that reads top to bottom
(`templates/page-outline.md` has the section order):

1. Builds walked and the date; what was not walked.
2. The counts per label, today and after.
3. The ordered blockers.
4. One section per path: each screen as a card with its screenshot, title,
   route, role and state, and its actions with a coloured label (colour never
   alone: the label word is always shown).
5. Messages, jobs and switches.
6. Code health table: concepts × builds.
7. Differences from production.

Check it before handing it over: at 375 px and 1440 px, in light and dark, no
horizontal scroll, every image loads.

### 8. Compare with the previous atlas

If an earlier atlas exists, add a table of counts (each label, and each
code-health concept) previous → now. A falling share of **Works** or a rising
copy count is itself a blocker.

## Output

Print, in this order: builds walked; counts (screens, actions per label,
messages, images, total MB); the ordered blockers, one line each; code health
cleaned versus guarded; not walked and why; where the page is.

Hand the page to the owner as the thing to read, not the summary. The
owner's review turns each blocker into owned work or an explicit "not now".
