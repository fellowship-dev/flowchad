# Flow Anatomy

How to decompose a product into testable flows. A **flow** is a sequence of steps a user takes to accomplish a specific goal within the product.

## What Is a Flow

A flow has:
- **One clear goal** the user is trying to achieve
- **A defined entry point** where the user begins
- **One or more paths** through the product (happy, error, edge)
- **A terminal state** where the goal is achieved, abandoned, or failed

A flow is NOT:
- A single page or screen (that's a view)
- A feature list (that's a spec)
- A user story (that's a requirement — a flow is the concrete path through the product that satisfies the story)

## Decomposition Process

### Step 1: Identify User Goals

List the distinct things a user wants to accomplish with the product. Use verb + noun format:

- "Create an account"
- "Submit an order"
- "Invite a team member"
- "Export a report"
- "Reset a password"

Each goal maps to at least one flow.

### Step 2: Map Entry Points

For each goal, identify how the user arrives at the starting point:

| Entry Type | Description | Example |
|---|---|---|
| Direct navigation | User goes to a known URL or screen | Typing `/settings` in the browser |
| In-app link | User clicks from within the product | "Invite" button on team page |
| External link | User arrives from outside the product | Email link, shared URL, notification |
| Search result | User finds the starting point via search | Searching "billing" in the app |
| Deeplink | User arrives at a mid-flow state | Email verification link, payment confirmation |

A single goal may have multiple entry points. Each entry point variation should be tested.

### Step 3: Trace the Happy Path

The happy path is the **shortest, most common** route from entry to goal completion with no errors, edge cases, or detours.

Document it as an ordered list of steps:

```
Flow: Create an account
Entry: Landing page CTA "Get Started"

1. User clicks "Get Started"
2. Sign-up form appears (email, password, name)
3. User fills all fields correctly
4. User clicks "Create Account"
5. Confirmation screen appears
6. User clicks verification link in email
7. Dashboard loads with onboarding prompt
```

Each step should describe:
- **What the user does** (action)
- **What the system shows** (response)

### Step 4: Map Error Paths

For each step in the happy path, ask: "What if this goes wrong?"

Common error categories:
- **Validation errors**: Invalid input, missing required fields
- **System errors**: Server failure, timeout, network loss
- **Permission errors**: Unauthorized access, expired session
- **State errors**: Resource not found, already deleted, concurrent edit

Document each error path as a branch from the happy path:

```
Step 3 (error): User enters an already-registered email
  3a. Form shows inline error: "Email already in use"
  3b. User can correct or navigate to login

Step 4 (error): Server returns 500
  4a. Error message appears: "Something went wrong, please try again"
  4b. Form data is preserved
  4c. User can retry without re-entering data
```

### Step 5: Identify Edge Cases

Edge cases are valid but uncommon paths that are easy to overlook:

- **Boundary values**: Empty strings, maximum lengths, special characters, Unicode
- **State transitions**: User navigates away mid-flow, browser back button, session timeout
- **Concurrent actions**: Two users editing the same resource, duplicate form submission
- **Platform variations**: Different browsers, screen sizes, input methods (keyboard-only, screen reader)
- **Data variations**: First-time user vs. returning user, empty state vs. populated state, single item vs. many items

Document edge cases as annotations on the relevant step:

```
Step 2 (edge): User has JavaScript disabled
  - Form should still be submittable (progressive enhancement)
  - OR: clear message that JS is required

Step 6 (edge): Verification email never arrives
  - "Resend" option must be available
  - Resend must be rate-limited
  - User should not be trapped in a state where they can't re-enter
```

## When to Split a Flow

**Split** a flow into separate flows when:

- The goal changes. "Create an account" and "Set up a profile" are different goals even if they happen consecutively.
- There is a meaningful pause. If the user is expected to leave and come back (e.g., email verification), that is a natural split point.
- The entry points diverge significantly. "Invite a member via email" and "Invite a member via link" share a goal but have substantially different paths.
- The flow exceeds 15 steps on the happy path. Long flows are harder to evaluate and more likely to contain distinct sub-goals.

**Keep as one flow** when:

- The steps are tightly coupled and skipping any one breaks the sequence.
- The user experiences it as a single, continuous interaction.
- Splitting would create flows with only 1-2 steps that don't make sense in isolation.

## Flow Naming Convention

Use this format: `[verb]-[noun](-[qualifier])`

Examples:
- `create-account`
- `submit-order`
- `invite-member-via-email`
- `invite-member-via-link`
- `reset-password`
- `export-report-csv`

Qualifiers disambiguate when multiple flows share the same verb-noun pair.

## Flow Documentation Template

```markdown
# Flow: [Name]

## Goal
[What the user is trying to accomplish]

## Entry Points
- [Entry point 1]
- [Entry point 2]

## Preconditions
- [State that must be true before the flow begins]

## Happy Path
1. [Step 1: user action → system response]
2. [Step 2: user action → system response]
...

## Error Paths
### [Error name]
- Trigger: [What causes this error]
- Branch point: Step N
- Expected behavior: [What should happen]
- Recovery: [How the user gets back on track]

## Edge Cases
- [Edge case 1]: [Expected handling]
- [Edge case 2]: [Expected handling]

## Success Criteria
- [How to determine the flow completed successfully]

## Connected Flows
- Leads to: [Flow that typically follows]
- Leads from: [Flow that typically precedes]
```

## Completeness Checklist

Before considering a flow fully documented, verify:

- [ ] At least one entry point is defined
- [ ] Happy path has numbered steps with both user actions and system responses
- [ ] Each step that accepts user input has at least one error path
- [ ] System errors (500, timeout, network loss) are addressed for steps involving server communication
- [ ] Edge cases for empty states, boundary values, and navigation interruptions are noted
- [ ] Success criteria are defined (how to verify the flow completed)
- [ ] Connected flows are listed (what comes before/after)
