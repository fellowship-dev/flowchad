<!-- prefix: DOCS -->
# Docs cold start

Docs are walked by a fresh reader: a new agent session in an empty folder,
given only the product's public address and a goal ("install this and get the
first result"). It may read the docs and run commands; every question it
cannot answer from the docs is recorded, not answered for it.

### DOCS-01 · A fresh agent gets there without asking

- **Rule:** A fresh agent in an empty folder reaches a working install and the value moment from the public docs alone, with no questions to a person.
- **Check:** Start a new agent session with no project context in an empty folder, give it the public docs address and the goal, and answer nothing. Record each question it could not answer from the docs (`unanswered_questions`) and each command it ran (`commands_to_install`). Fail if any question remains or the value moment is not reached.
- **Measure:** `unanswered_questions`, `commands_to_install`
- **Threshold:** `unanswered_questions = 0`
- **Severity:** blocker
- **Applies to:** docs
- **Basis:** source — Diátaxis, "Tutorials", <https://diataxis.fr/tutorials/> (checked 2026-11-15): "Aspire to perfect reliability"; the tutorial "works for every user, every time."
- **Basis:** source — Jeff Sauro, "10 Things To Know About Completion Rates" (MeasuringU, 2011), <https://measuringu.com/completion-rates/> (checked 2026-11-15): "Completion rates are the fundamental usability metric".
- **Threshold source:** <https://diataxis.fr/tutorials/> (checked 2026-11-15): a guide that works for every user, every time leaves no question unanswered; zero is that standard, not a number from the source.
- **Pass:** From an empty folder, the agent follows the install page, runs five commands and shows the first result, without asking anything.
- **Fail:** The agent stops to ask which of two install methods applies, because the docs describe both and never say who each is for.
- **Since:** 0.5.0

### DOCS-02 · The install guide is a tutorial

- **Rule:** The install guide is one ordered path of steps with a visible result after each, and explanation is linked out rather than written inline.
- **Check:** Read the install guide from top to bottom. Fail if it branches without saying who takes which branch, if a step has no visible result to confirm it worked, or if background explanation sits between the steps.
- **Severity:** should-fix
- **Applies to:** docs
- **Basis:** source — Diátaxis, "Tutorials", <https://diataxis.fr/tutorials/> (checked 2026-11-15): "Deliver visible results early and often"; "Ruthlessly minimise explanation" and link to it instead.
- **Pass:** "1. Install. You should see `ready`. 2. Connect your account. You should see your projects listed." with a link to "How it works".
- **Fail:** An install page that opens with the architecture, then offers three install methods without saying which one to use.
- **Since:** 0.5.0

### DOCS-03 · Commands run as written

- **Rule:** Every command in the docs runs as written when pasted, with each placeholder marked and explained beside it.
- **Check:** Paste each command from the guide in order, in a fresh environment, replacing only marked placeholders. Record each command that failed or had to be changed (`wrong_turns`) with the doc line that misled. Fail any such command.
- **Measure:** `wrong_turns`
- **Severity:** should-fix
- **Applies to:** docs
- **Basis:** source — Diátaxis, "Tutorials", <https://diataxis.fr/tutorials/> (checked 2026-11-15): when you ask the reader to do something, "they must see the result you promise."
- **Pass:** `export API_TOKEN=<your token from Settings › Tokens>` followed by commands that work unchanged.
- **Fail:** A command uses a flag that the current version no longer accepts, and the guide does not mention the version it was written for.
- **Since:** 0.5.0
