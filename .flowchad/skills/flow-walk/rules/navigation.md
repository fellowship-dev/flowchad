<!-- prefix: NAV -->
# Navigation

Navigation is judged from the visitor's side: the order they need things in,
whether they can tell where they are, and whether every item offered actually
works for them. When a flow sends someone away (to an email, a provider, a
sign-in), it must bring them back.

### NAV-01 · Menu order follows the path to value

- **Rule:** The main menu puts first, closest to where it opens, the items the named visitor needs on the way to value, not items in build order or team structure.
- **Check:** Name the visitor the menu serves (new or returning) and write the order they need the items in. Fail if the menu order differs without a stated reason, or if the menu serves no named visitor.
- **Severity:** later
- **Applies to:** step, flow
- **Basis:** source — Page Laubheimer, "Menu-Design Checklist: 17 UX Guidelines" (Nielsen Norman Group, 2024), guideline 16, <https://www.nngroup.com/articles/menu-design/> (checked 2026-11-15): "Optimize for Easy Physical Access to Frequently Used Commands": put "the most common items close to the link target that launches the dropdown".
- **Basis:** source — Jon Yablonski, "Serial Position Effect" (Laws of UX), <https://lawsofux.com/serial-position-effect/> (checked 2026-11-15): "Users have a propensity to best remember the first and last items in a series."
- **Pass:** A new account's menu in a booking tool reads "Calendar, Services, Clients, Settings", the order of first setup.
- **Fail:** A new account's menu starts with "Audit log" and "API", and the item that starts setup is fifth.
- **Since:** 0.5.0

### NAV-02 · Every screen says where you are

- **Rule:** Every screen shows which product it is, where the person is and how to get back, without relying on the browser's back button.
- **Check:** On each screen, cover the address bar and name the product, the current page and the way back. Fail any screen where one of the three is missing.
- **Severity:** later
- **Applies to:** step
- **Basis:** source — Susan Farrell, "Navigation: You Are Here" (Nielsen Norman Group, 2015), <https://www.nngroup.com/articles/navigation-you-are-here/> (checked 2026-11-15): "Navigation should not only show where you can go but also where you are now"; make it easy to identify the website and the page topic at a glance.
- **Pass:** A settings page shows the product name, "Settings › Billing" and a link back to the dashboard.
- **Fail:** A full-screen step with no product name, no heading for where the person is and no way back but the browser.
- **Since:** 0.5.0

### NAV-03 · Nothing offered that cannot work

- **Rule:** No menu item, button or link on the path leads to a feature that is unavailable for this account without saying so before the click.
- **Check:** Open every menu item and button the walk sees on the path (read-only where the surface is live). Fail any that ends in an error, an empty "not configured" screen or a feature this plan or setup cannot use.
- **Severity:** should-fix
- **Applies to:** step, flow
- **Basis:** source — Nielsen Norman Group, "10 Usability Heuristics for User Interface Design" (1994, last reviewed 2024), heuristic 5, error prevention, <https://www.nngroup.com/articles/ten-usability-heuristics/> (checked 2026-11-15): "the best designs carefully prevent problems from occurring in the first place."
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-21, FN-2026-11-22).
- **Pass:** "Team invites" is shown with "Available after your first project is created" and no link until then.
- **Fail:** "Team invites" is in the menu from the start, and every attempt ends on a "Not configured" error.
- **Since:** 0.5.0

### NAV-04 · Leaving the flow brings you back

- **Rule:** When the flow sends the person elsewhere (an email link, a sign-in, another service or another page of the product), it returns them to the step they left, with what they entered kept.
- **Check:** For every step that leaves the flow, note where the person lands on return. Fail if they land anywhere other than the step they left, or if their earlier input is gone.
- **Severity:** should-fix
- **Applies to:** step, flow, map
- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-23, FN-2026-11-24).
- **Pass:** "Connect your account" opens the provider, and after approving the person is back on the same setup step with the connection shown.
- **Fail:** A "fix this" button opens a separate page that asks again for the item to fix, and after fixing it there is no way back to the setup step.
- **Since:** 0.5.0
