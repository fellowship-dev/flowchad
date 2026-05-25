---
description: Reproduce a customer-reported bug in-browser — reads a GitHub issue, infers a reproduction flow, walks it via Playwright, and updates the issue with evidence and a reproduced/could-not-reproduce label
disable-model-invocation: false
---

Reproduce the bug described in GitHub issue $ARGUMENTS using the flow-reproduce skill.

1. Parse $ARGUMENTS as a GitHub issue reference (bare number, `owner/repo#N`, or full URL)
2. Fetch the issue body and comments from GitHub
3. Extract error context: error message, affected URL, triggering action, auth state
4. Infer a minimal reproduction flow and save it to `.flowchad/flows/reproduce-issue-{N}.yml`
5. Walk the flow using Playwright CDP, capturing screenshots and video
6. Determine outcome: `reproduced` or `could-not-reproduce`
7. Upload evidence and post a structured comment to the original issue
8. Apply `reproduced` or `could-not-reproduce` label to the issue
9. Print the outcome summary and display the GIF

Follow the flow-reproduce skill instructions exactly.
