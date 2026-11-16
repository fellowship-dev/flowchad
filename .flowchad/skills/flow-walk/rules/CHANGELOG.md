# Rules changelog

Every change to the rule set, newest first. Each line names the rule ids it
touches, so a rule's history can be found with a search for its id. The lint
fails if a rule id never appears here.

## 0.5.0 (2026-11-15)

First rule set. Seeded from the maintainer's field notes of November 2026
(walks of a marketing site, a hosted app and its docs, and reference walks of
two well-regarded products), each rule worded without product nouns and
admitted only with a public source or failures in two independent flows.

Added:

- Path to value: PATH-01, PATH-02, PATH-03, PATH-04, PATH-05, PATH-06
- Primary action and the fold: FOLD-01, FOLD-02, FOLD-03, FOLD-04
- Decisions and inputs: DEC-01, DEC-02, DEC-03, DEC-04, DEC-05
- Noise: NOISE-01, NOISE-02, NOISE-03, NOISE-04, NOISE-05
- Wording: WORD-01, WORD-02, WORD-03, WORD-04, WORD-05
- Navigation: NAV-01, NAV-02, NAV-03, NAV-04
- Waiting and empty states: WAIT-01, WAIT-02, WAIT-03, WAIT-04
- Errors and dead ends: ERR-01, ERR-02, ERR-03, ERR-04
- Docs cold start: DOCS-01, DOCS-02, DOCS-03
- Agent experience: AGENT-01, AGENT-02, AGENT-03, AGENT-04

Revised in review, before release (each rule keeps id and `Since: 0.5.0`):

- Sources re-opened on 2026-11-15; every source basis now carries its check
  date. The useronboard.com citations were removed from PATH-01, PATH-02,
  PATH-03, PATH-04, WAIT-04 and ERR-01 (a teardown index naming no author and
  stating neither claim); PATH-04 now rests on its field basis alone.
  Book-only citations whose claim cannot be read online were replaced or
  dropped: NAV-02 (NN/g "Navigation: You Are Here"), FOLD-03 (GOV.UK Design
  System Button, Krug's published excerpt), FOLD-02, NOISE-03, NOISE-04,
  WORD-01 (NN/g menu-design guideline 7) and NAV-01. PATH-01 and DOCS-01 cite
  MeasuringU's completion-rates article instead of its homepage; AGENT-02 the
  dated MCP authorization section; AGENT-01 and AGENT-02 quote Biilmann
  exactly; WORD-03 and DEC-04 quote the confirmation-dialog article as it
  reads.
- NAV-01: severity later; reworded to the menu-design guideline it cites
  (guideline 16, frequent items closest to where the menu opens) plus the
  serial-position effect, cited separately.
- AGENT-01: machine-readable docs, `/llms.txt` as one example (a proposal,
  not a standard); severity later.
- FOLD-01: states its viewports (375 × 812 px, 1440 × 900 px) and defines the
  primary element as the first input the step needs, not the submit button;
  zero scroll is FlowChad's own standard, motivated by the cited attention
  data.
- FOLD-02: limited to the main column, so site headers and breadcrumbs
  (NAV-02) no longer fail it.
- DEC-05: accepts paste or a password manager for anything recalled, so a
  password login no longer fails it.
- PATH-06: new fail example, distinct from DEC-02's.
- Examples genericised across rules (booking, invoicing, file sharing):
  PATH-02, PATH-04, NOISE-01, NOISE-03, NOISE-05, WORD-01, WORD-03, WORD-04,
  WORD-05, DEC-01, DEC-03, WAIT-01, WAIT-03, WAIT-04, FOLD-04, NAV-01, NAV-03,
  DOCS-02.
- Field bases carry one field-note id per observation (FN-2026-11-01 to
  FN-2026-11-29); numbers in a Rule or Check carry a `Threshold source`
  (FOLD-01, FOLD-04, DEC-01, NOISE-03, WAIT-01, WAIT-02, ERR-01, DOCS-01,
  AGENT-04).
- The shipped forbidden-terms list keeps vendor and brand names only; generic
  protocol and record-type terms were removed.

Considered and not admitted:

- *Preselect a default on every choice.* Contradicted by the GOV.UK Design
  System's radios guidance, which advises against preselecting an option
  because people miss it. DEC-03 (derive instead of asking) covers the cases
  where the product can decide.
- *Use the full width of large screens for app layouts.* One product, one
  observer, and in tension with readable line length (Refactoring UI). Kept as
  a field note until a source or a second independent flow supports it; FOLD-02
  already asks for secondary content beside the primary action.
- *No gradients or generic "AI-looking" styling.* A visual-style rule, not a
  flow rule; visual critique tools cover it better than a walk does.
- *A pasteable "what it is, for whom, price" paragraph on the public site.* A
  positioning check, not a flow step; no source sets it as a usability rule.
