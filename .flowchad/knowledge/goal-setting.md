# Goal Setting

How to define "success" for a product and connect flow-level measurements to business outcomes. Without clear goals, evaluation becomes an unbounded list of observations. Goals convert observations into actionable findings.

## The Goal Hierarchy

Goals exist at three levels. Each level informs the one below it.

```
Business Goals
  └── Product Goals
        └── Flow Goals
```

### Business Goals

What the organization is trying to achieve. These are expressed in business terms, not product terms.

Examples:
- Increase monthly recurring revenue by 20%
- Reduce customer support ticket volume by 30%
- Achieve 90-day retention rate of 60%
- Enter a new market segment

Business goals are **inputs to the evaluation**, not outputs. The evaluator does not set or challenge them — they come from the product owner.

### Product Goals

What the product must do to support the business goals. These translate business objectives into measurable product behaviors.

| Business Goal | Product Goal |
|---|---|
| Increase MRR by 20% | Improve trial-to-paid conversion rate from 8% to 12% |
| Reduce support tickets by 30% | Achieve 95% self-service resolution rate for top 5 support topics |
| 60% 90-day retention | Ensure 80% of users complete onboarding within first session |
| Enter new market segment | Achieve WCAG 2.1 AA compliance for public-facing surfaces |

### Flow Goals

What each individual flow must achieve to support the product goals. These are directly measurable during evaluation.

| Product Goal | Flow | Flow Goal |
|---|---|---|
| 12% trial-to-paid conversion | `upgrade-plan` | Completion rate > 90%, latency p50 < 2s, zero Critical findings |
| 95% self-service resolution | `search-help-docs` | Relevant result in top 3 for 95% of queries |
| 80% onboarding completion | `complete-onboarding` | Completion rate > 80%, zero dead ends, < 5 min total |
| WCAG 2.1 AA compliance | All public flows | Lighthouse accessibility score > 90 on all pages |

## Setting Flow Goals

### Step 1: Define the Success Criteria

Every flow needs at least these three goal dimensions:

1. **Completion**: Can the user finish the flow? Target: percentage of attempts that succeed.
2. **Efficiency**: How quickly/easily can the user finish? Target: step count, time, or latency.
3. **Quality**: Does the experience meet standards? Target: maximum acceptable findings by severity.

Template:

```
Flow: [name]
Completion target: [X]% of attempts succeed
Efficiency target: [metric] < [threshold]
Quality target: Zero Critical, max [N] Friction, Cosmetic tracked but not blocking
```

### Step 2: Set Thresholds

Thresholds define pass/fail boundaries. Use three tiers:

| Tier | Meaning | Action |
|---|---|---|
| **Target** | The desired state | No action needed. Flow is healthy. |
| **Warning** | Below target but still functional | Investigate. Schedule improvement work. |
| **Failure** | Below acceptable minimum | Immediate action required. This is a release blocker. |

Example for an `upgrade-plan` flow:

| Metric | Failure | Warning | Target |
|---|---|---|---|
| Completion rate | < 70% | < 85% | > 90% |
| Latency (p50) | > 5s | > 3s | < 2s |
| Critical findings | > 0 | -- | 0 |
| Friction findings | > 5 | > 2 | 0 |

### Step 3: Weight by Business Impact

Not all flows matter equally. Assign importance based on how directly the flow supports business goals:

| Importance | Criteria | Examples |
|---|---|---|
| **Primary** | Directly drives revenue or retention | Sign-up, checkout, core value delivery |
| **Secondary** | Supports primary flows or reduces cost | Settings, help, notifications |
| **Tertiary** | Nice-to-have, low usage, or admin-only | Profile customization, export, audit logs |

Importance determines:
- Evaluation frequency (primary flows every run, tertiary only periodically)
- Threshold strictness (primary flows have tighter thresholds)
- Priority of findings (a Friction finding on a primary flow may outrank a Critical on a tertiary flow)

## Connecting Flows to Business Goals

Use a traceability matrix to make the connection explicit:

```
Business Goal: Increase MRR by 20%
  └── Product Goal: Trial-to-paid conversion 8% → 12%
        ├── Flow: complete-onboarding (primary)
        │     └── Goal: 80% completion, < 5 min, 0 Critical
        ├── Flow: upgrade-plan (primary)
        │     └── Goal: 90% completion, p50 < 2s, 0 Critical
        └── Flow: use-premium-feature (secondary)
              └── Goal: 85% completion, 0 Critical, < 3 Friction
```

This matrix serves two purposes:
1. **Prioritization**: When multiple findings compete for attention, trace them up to business goals to determine which matters more.
2. **Coverage**: If a business goal has no flows mapped to it, there is a gap in evaluation coverage.

## Goal Evolution

Goals are not static. They change as the product matures:

| Stage | Goal Focus |
|---|---|
| **Pre-launch** | Functional correctness. Can users complete flows at all? Threshold: zero Critical findings. |
| **Early** | Activation and onboarding. Can new users get to value quickly? Threshold: onboarding completion > 50%. |
| **Growth** | Conversion and retention. Are users converting and returning? Threshold: funnel metrics meet targets. |
| **Mature** | Efficiency and polish. Are power users well-served? Threshold: Friction findings trending toward zero. |

When the product stage changes, re-evaluate all flow goals and thresholds.

## Default Goals

When no explicit goals are provided, apply these defaults:

| Metric | Default Target | Default Failure |
|---|---|---|
| Flow completion rate | > 90% | < 70% |
| Step latency (p50) | < 1s | > 5s |
| Critical findings | 0 | > 0 |
| Friction findings per flow | < 3 | > 5 |
| Visual consistency score | > 85% | < 60% |

These defaults are **starting points**. They should be overridden with product-specific goals as soon as the context is available.

## Rules for the AI

1. **Never evaluate without goals.** If no goals are defined, apply the defaults and flag that custom goals are needed.
2. **Always trace findings to goals.** Every finding should reference which flow goal it affects, and by extension which product/business goal.
3. **Distinguish failing from degrading.** A metric in the Warning zone is not the same as a metric in the Failure zone. Report both the current state and the trend.
4. **Goals inform priority, not severity.** A finding's severity (Critical/Friction/Cosmetic) is determined by the friction taxonomy. Its priority is determined by the goal it affects. A Cosmetic finding on a primary flow may be higher priority than a Friction finding on a tertiary flow.
5. **Flag coverage gaps.** If a business goal has no mapped flows, or a flow has no defined goals, report it as a gap in the evaluation.
