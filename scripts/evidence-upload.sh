#!/bin/bash
# evidence-upload.sh — Upload screenshots/GIFs to GitHub via orphan branch
#
# Usage:
#   ./scripts/evidence-upload.sh <file> <repo> <path> [branch]
#
# Examples:
#   ./scripts/evidence-upload.sh screenshot.png owner/repo pr-42/step-01.png
#   ./scripts/evidence-upload.sh flow.gif owner/repo pr-42/flow.gif evidence
#
# Returns the raw URL for embedding in markdown.
#
# Prerequisites:
#   - gh CLI authenticated with repo access
#   - Evidence branch must exist (run evidence-init.sh first)

set -euo pipefail

FILE="${1:?Usage: evidence-upload.sh <file> <repo> <path> [branch]}"
REPO="${2:?Usage: evidence-upload.sh <file> <repo> <path> [branch]}"
REMOTE_PATH="${3:?Usage: evidence-upload.sh <file> <repo> <path> [branch]}"
BRANCH="${4:-evidence}"

if [ ! -f "$FILE" ]; then
  echo "Error: file not found: $FILE" >&2
  exit 1
fi

# Base64 encode the file
if command -v base64 >/dev/null 2>&1; then
  # macOS base64 doesn't support --wrap, but doesn't wrap by default
  CONTENT=$(base64 -i "$FILE" 2>/dev/null || base64 "$FILE")
else
  echo "Error: base64 command not found" >&2
  exit 1
fi

# Check if file already exists on the branch (update vs create)
EXISTING_SHA=$(gh api "repos/${REPO}/contents/${REMOTE_PATH}?ref=${BRANCH}" --jq '.sha' 2>/dev/null || echo "")

if [ -n "$EXISTING_SHA" ]; then
  # Update existing file
  gh api "repos/${REPO}/contents/${REMOTE_PATH}" \
    --method PUT \
    -f message="Update evidence: ${REMOTE_PATH}" \
    -f content="$CONTENT" \
    -f branch="$BRANCH" \
    -f sha="$EXISTING_SHA" \
    --silent
else
  # Create new file
  gh api "repos/${REPO}/contents/${REMOTE_PATH}" \
    --method PUT \
    -f message="Add evidence: ${REMOTE_PATH}" \
    -f content="$CONTENT" \
    -f branch="$BRANCH" \
    --silent
fi

# Return the raw URL
echo "https://raw.githubusercontent.com/${REPO}/${BRANCH}/${REMOTE_PATH}"
