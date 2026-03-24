#!/bin/bash
# evidence-init.sh — Create the evidence orphan branch on a GitHub repo
#
# Usage:
#   ./scripts/evidence-init.sh [repo] [branch]
#
# Examples:
#   ./scripts/evidence-init.sh owner/repo
#   ./scripts/evidence-init.sh owner/repo visual-evidence
#
# If repo is omitted, detects from git remote origin.
# Creates an orphan branch with a single README commit via the API
# (no local git operations needed).

set -euo pipefail

# Detect repo from git remote if not provided
if [ -n "${1:-}" ]; then
  REPO="$1"
else
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -z "$REMOTE_URL" ]; then
    echo "Error: no repo specified and no git remote found" >&2
    exit 1
  fi
  # Extract owner/repo from HTTPS or SSH URL
  REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')
fi

BRANCH="${2:-evidence}"

# Check if branch already exists
if gh api "repos/${REPO}/branches/${BRANCH}" --silent 2>/dev/null; then
  echo "Branch '${BRANCH}' already exists on ${REPO}"
  exit 0
fi

# Get the default branch's latest commit SHA to use as a base
# We'll create a tree with just a README, then create a commit with no parents (orphan)
EMPTY_TREE=$(gh api "repos/${REPO}/git/trees" \
  --method POST \
  --jq '.sha' \
  -f 'tree[][path]=README.md' \
  -f 'tree[][mode]=100644' \
  -f 'tree[][type]=blob' \
  -f 'tree[][content]=# Evidence\n\nScreenshots, GIFs, and visual evidence uploaded by FlowChad.\nThis branch is auto-managed — do not commit here manually.\n')

COMMIT_SHA=$(gh api "repos/${REPO}/git/commits" \
  --method POST \
  --jq '.sha' \
  -f message="Initialize evidence branch" \
  -f tree="$EMPTY_TREE")

gh api "repos/${REPO}/git/refs" \
  --method POST \
  -f ref="refs/heads/${BRANCH}" \
  -f sha="$COMMIT_SHA" \
  --silent

echo "Created orphan branch '${BRANCH}' on ${REPO}"
