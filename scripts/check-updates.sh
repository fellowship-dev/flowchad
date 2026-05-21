#!/usr/bin/env bash
# check-updates.sh — compare installed flowchad version against upstream HEAD
# Run from your project root: bash scripts/check-updates.sh

set -euo pipefail

VERSION_FILE=".flowchad/.version"

if [ ! -f "$VERSION_FILE" ]; then
  echo "flowchad: no .version file found — run install.sh or update.sh to initialize"
  exit 1
fi

INSTALLED_VER=$(sed -n '1p' "$VERSION_FILE")
INSTALLED_SHA=$(sed -n '2p' "$VERSION_FILE")
INSTALLED_DATE=$(sed -n '3p' "$VERSION_FILE")

echo "Installed: $INSTALLED_VER (${INSTALLED_SHA:0:7} — $INSTALLED_DATE)"
echo "Checking upstream..."

LATEST_SHA=$(git ls-remote https://github.com/Fellowship-dev/flowchad.git HEAD | cut -f1)

if [ "$INSTALLED_SHA" = "$LATEST_SHA" ]; then
  echo "flowchad is up to date"
else
  echo "Update available: ${INSTALLED_SHA:0:7} → ${LATEST_SHA:0:7}"
  echo "Run: bash scripts/update.sh"
fi
