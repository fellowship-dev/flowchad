<!-- prefix: NAV -->
# Navigation

Navigation is judged from the visitor's side: the order they need things in,
whether they can tell where they are, and whether every item offered actually
works for them. When a flow sends someone away (to an email, a provider, a
sign-in), it must bring them back.

### NAV-01 · Menu order follows the path to value

- **Rule:** The main menu lists items in the order the named visitor needs them on the way to value, not in build order or team structure.
- **Check:** Name the visitor the menu serves (new or returning) and write the order they need the items in. Fail if the menu order differs without a stated reason, or if the menu serves no named visitor.
- **Severity:** should-fix
- **Applies to:** step, flow
- **Basis:** source — Nielsen Norman Group, "Menu-Design Checklist: 17 UX Guidelines" (2024), <https://www.nngroup.com/articles/menu-design/>: order menu items in a way that makes sense to people, putting the most important items where they are seen first.
- **Basis:** source — Louis Rosenfeld, Peter Morville and Jorge Arango, *Information Architecture* (4th ed., 2015), <https://www.oreilly.com/library/view/information-architecture-4th/9781491913529/>: choose the organisation scheme for a named audience and task.
- **Pass:** A new account's menu reads "Sites, Reports, Team, Settings", the order of first setup.
- **Fail:** A new account's menu starts with "Audit log" and "API", and the item that starts setup is fifth.
- **Since:** 0.5.0

### NAV-02 · Every screen says where you are

- **Rule:** Every screen shows which product it is, where the person is and how to get back, without relying on the browser's back button.
- **Check:** On each screen, cover the address bar and name the product, the current page and the way back. Fail any screen where one of the three is missing.
- **Severity:** later
- **Applies to:** step
- **Basis:** source — Steve Krug, *Don't Make Me Think, Revisited* (3rd ed., 2014), <https://sensible.com/dont-make-me-think/>: the trunk test; dropped on any page, a person can tell the site, the page and the main sections.
- **Pass:** A settings page shows the product name, "Settings › Billing" and a link back to the dashboard.
- **Fail:** A full-screen step with no product name, no heading for where the person is and no way back but the browser.
- **Since:** 0.5.0

### NAV-03 · Nothing offered that cannot work

- **Rule:** No menu item, button or link on the path leads to a feature that is unavailable for this account without saying so before the click.
- **Check:** Open every menu item and button the walk sees on the path (read-only where the surface is live). Fail any that ends in an error, an empty "not configured" screen or a feature this plan or setup cannot use.
- **Severity:** should-fix
- **Applies to:** step, flow
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, updated 2024), heuristic 5, error prevention, <https://www.nngroup.com/articles/ten-usability-heuristics/>: prevent problems from occurring in the first place rather than reporting them afterwards.
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** "Team invites" is shown with "Available after your first site is set up" and no link until then.
- **Fail:** "Team invites" is in the menu from the start, and every attempt ends on a "Not configured" error.
- **Since:** 0.5.0

### NAV-04 · Leaving the flow brings you back

- **Rule:** When the flow sends the person elsewhere (an email link, a sign-in, another service or another page of the product), it returns them to the step they left, with what they entered kept.
- **Check:** For every step that leaves the flow, note where the person lands on return. Fail if they land anywhere other than the step they left, or if their earlier input is gone.
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11).
- **Pass:** "Connect your account" opens the provider, and after approving the person is back on the same setup step with the connection shown.
- **Fail:** A "fix this" button opens a separate page that asks again for the item to fix, and after fixing it there is no way back to the setup step.
- **Since:** 0.5.0
