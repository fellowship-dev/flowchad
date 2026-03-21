# Platform Types

Different product types demand different evaluation criteria. This document defines four platform archetypes and the specific concerns, flows, and quality signals relevant to each.

When evaluating a product, first identify its platform type. A single product may span multiple types (e.g., a SaaS app with a public marketing site). Evaluate each surface against the matching type.

---

## SaaS Application

A web application where users create accounts, perform tasks, and derive ongoing value. Revenue depends on activation, retention, and expansion.

### Primary Evaluation Concerns

- **Onboarding**: Time-to-first-value. Can a new user reach the "aha moment" without external help?
- **Conversion funnels**: Free-to-paid, trial-to-subscription, plan upgrades. Every step is a potential drop-off.
- **Retention flows**: Daily/weekly usage loops. What brings the user back? Is the return experience smooth?
- **Collaboration**: Multi-user features (invites, permissions, shared state). Collaboration bugs are high-severity because they affect trust.
- **Data management**: Import, export, backup, deletion. Users need confidence their data is safe and portable.
- **Billing and account**: Subscription changes, payment updates, invoice access. Errors here erode trust immediately.

### Key Metrics

- Onboarding completion rate (% of sign-ups reaching first value action)
- Funnel drop-off per step
- Session depth (actions per session)
- Error rate on critical paths (checkout, save, share)
- Time-to-task for core workflows

### Common Pitfalls

- Onboarding that teaches features instead of outcomes
- Empty states that provide no guidance
- Settings sprawl with no search or organization
- Notification overload that trains users to ignore alerts
- Upgrade prompts that interrupt the current task

---

## Public Website

A content-oriented site (marketing, documentation, blog, portfolio) where the primary goal is discoverability, readability, and conversion to a next action (sign-up, contact, download).

### Primary Evaluation Concerns

- **SEO fundamentals**: Semantic HTML, meta tags, structured data, canonical URLs, crawlability. A beautiful site that search engines can't index is invisible.
- **Accessibility**: WCAG 2.1 AA compliance. Keyboard navigation, screen reader compatibility, sufficient contrast, alt text on images.
- **Load performance**: First Contentful Paint, Largest Contentful Paint, Cumulative Layout Shift. Every 100ms of delay costs conversions.
- **Content hierarchy**: Is the most important information visible without scrolling? Does the visual hierarchy match the information hierarchy?
- **Calls to action**: Are CTAs clear, consistent, and reachable from every page? Is there a logical next step at every point?
- **Mobile responsiveness**: Not just "it fits on a small screen" but "the experience is intentionally designed for mobile."

### Key Metrics

- Core Web Vitals (LCP, CLS, INP)
- Lighthouse accessibility score
- Bounce rate per landing page
- CTA click-through rate
- Mobile vs. desktop completion rates

### Common Pitfalls

- Hero sections with no clear value proposition
- Images without alt text or with decorative alt text on informational images
- JavaScript-heavy pages that render blank without JS
- Cookie consent banners that obscure primary content on mobile
- Footer-only navigation for important pages (contact, pricing)

---

## Mobile Application

A native or hybrid app running on iOS/Android. Evaluated in the context of touch interaction, variable connectivity, and platform conventions.

### Primary Evaluation Concerns

- **Touch targets**: Minimum 44x44 points (iOS) / 48x48 dp (Android). Spacing between targets matters as much as size.
- **Navigation patterns**: Tab bar, drawer, stack navigation. Does the app follow platform conventions? Can the user always get back to where they were?
- **Offline behavior**: What happens when connectivity drops mid-task? Does the app degrade gracefully, queue actions, or crash?
- **Permission requests**: Camera, location, notifications. Are they requested in context (when the user needs the feature) or upfront (which feels invasive)?
- **Gestures**: Swipe, long-press, pinch. Are they discoverable? Is there always a non-gesture alternative?
- **State preservation**: Does the app restore state after backgrounding, rotation, or low-memory termination?

### Key Metrics

- Touch target compliance rate (% of interactive elements meeting size minimums)
- Cold start time (launch to interactive)
- Crash rate per session
- Offline task completion rate
- Permission grant rate (low rates indicate poor timing/context)

### Common Pitfalls

- Tap targets that are technically large enough but too close together
- Loading states that block the entire screen instead of the affected component
- Back button behavior that is inconsistent or loses form data
- Notifications that launch the app to the wrong screen
- Text input fields that are obscured by the keyboard
- Horizontal scrolling where vertical is expected

---

## Internal Tool

A tool used by employees, operators, or administrators. The user base is small, trained, and captive — but their efficiency directly impacts business operations.

### Primary Evaluation Concerns

- **Efficiency**: Clicks-to-task for common operations. Power users will perform the same action hundreds of times; every unnecessary click compounds.
- **Error recovery**: Internal tools handle sensitive operations (refunds, data edits, access changes). Undo, confirmation dialogs, and audit trails are essential.
- **Power user patterns**: Keyboard shortcuts, bulk operations, saved filters, customizable views. The tool should grow with the user's expertise.
- **Data density**: Internal users often need to see many records at once. Tables, dashboards, and list views should prioritize information density over whitespace.
- **Search and filtering**: The primary interaction model for most internal tools. Must be fast, flexible, and support complex queries.
- **Edge case handling**: Internal tools encounter more data variety than consumer products. Null values, extreme lengths, special characters, timezone mismatches — all must be handled.

### Key Metrics

- Time-to-task for top 5 most frequent operations
- Error rate on destructive operations (delete, modify, override)
- Keyboard-only task completion rate
- Search result relevance (do users click the first result or refine?)
- Recovery time after an error (time from mistake to corrected state)

### Common Pitfalls

- Consumer-grade spacing and card layouts that waste screen space
- No keyboard shortcuts for frequent actions
- Confirmation dialogs that don't describe what will happen
- Audit logs that are present but unsearchable
- Pagination with no option for "show all" or bulk select
- Role/permission UI that doesn't preview the effective result

---

## Identifying Platform Type

When the platform type is not explicitly specified, infer it from these signals:

| Signal | Likely Type |
|---|---|
| Login/signup flow with subscription | SaaS |
| No authentication, content-heavy | Public Website |
| App store distribution, native UI elements | Mobile App |
| Restricted access, admin features, data tables | Internal Tool |
| Marketing pages + authenticated app | Public Website (marketing) + SaaS (app) — evaluate separately |

## Mixed-Type Products

Many products span multiple types. Rules:

1. **Identify each surface** and tag it with its type.
2. **Evaluate each surface against its own type's criteria.** Do not apply SaaS onboarding standards to a public landing page.
3. **Cross-surface transitions matter.** The handoff from public website to SaaS sign-up is a flow in itself and should be evaluated as a conversion funnel.
4. **Report findings grouped by surface**, not interleaved.
