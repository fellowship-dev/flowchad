# Atlas page: section order

One self-contained HTML page with images under `shots/`. The visual map is
useful without findings or a quality score.

1. **Header:** product, capture date, named builds and environments; distinguish
   a local copy, production settings and provider stand-ins from live capture.
2. **Flow index:** linked titles with each goal, role and entry point. State the
   mapping scope and link to known capture gaps.
3. **One section per flow:**
   - goal, starting conditions, entry points and possible outcomes;
   - connected screenshots in journey order, with stable screen anchors;
   - each screen's title, route, role and meaningful state;
   - transitions labelled with the action/condition and destination;
   - visible branches, loops, back/retry paths, shared screens and cross-flow
     links; mark external handoffs and exits;
   - relevant email/notification steps and whether captured or simulated.
   A diagram or linked screen overview can introduce a branching journey.
4. **Optional build comparison:** changed screens/paths beside their baseline,
   with the build and coverage difference stated. Do not imply that independent
   or conflicting changes were integrated.
5. **Capture gaps and environment differences:** unmapped flows, branches,
   roles/states and provider boundaries, with reasons. Counts, if useful, come
   from manifests and describe coverage, not an acceptance score.
6. **Optional observations:** link to screen/transition IDs and evidence;
   findings/QA reports are supporting material, not the navigation structure.

Layout: readable at 375 px and 1440 px; a flow index and stable anchors, legible
screenshots and explicit branch destinations. Any intentional horizontal
screenshot strip has a visible scroll affordance. Check every image/link.
