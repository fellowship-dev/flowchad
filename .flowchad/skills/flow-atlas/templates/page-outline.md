# Atlas page: section order

One self-contained HTML page with images under `shots/`. Plain words; the
label word is always printed next to its colour.

1. **Header:** product, date, builds walked (commit per build), one sentence
   on how it was walked (local copies with production settings and stand-ins).
2. **Counts:** one row per build: screens, actions, and actions per label
   (Works, Untrue text, Broken, Dead end, Hidden, Not built, Needs live test).
3. **Blockers in walking order:** numbered; each with what happens, the fix in
   flight or "nobody is working on this", the size.
4. **Paths A to N:** a section per path. Each screen is a card:
   - screenshot (375 px; 1440 px beside it when taken), lazy-loaded;
   - title, route, role, state;
   - actions as a list: label chip, action name, the evidence note.
   Screens from an "after" build sit next to the screen they change, marked
   with the change.
5. **Messages:** one card per message: rendered image, trigger, on in
   production or not, label.
6. **Scheduled jobs and switches:** a table: schedule, on in production, what
   it does, what happened when run.
7. **Code health:** concepts × builds table; cleaned versus guarded.
8. **Not walked** and **differences from production.**

Layout: a single column that fits 375 px with no horizontal scroll; cards in
a grid at wider widths; light and dark themes from the same colour tokens.
