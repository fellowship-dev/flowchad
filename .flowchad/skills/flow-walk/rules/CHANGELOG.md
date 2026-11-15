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
