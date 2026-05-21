#!/usr/bin/env bash
# update.sh — safe flowchad update that preserves user data
#
# Protected (never touched):
#   .flowchad/flows/       — your flow definitions
#   .flowchad/config.yml   — your project config
#   .flowchad/snapshots/   — walk results
#   .flowchad/reports/     — generated reports
#
# Updated (overwritten from upstream):
#   .flowchad/skills/      — AI skill instructions
#   .flowchad/commands/    — slash command definitions
#   .flowchad/knowledge/   — reference docs
#   .flowchad/templates/   — starter flow templates
#   .flowchad/.gitignore   — internal gitignore
#   .flowchad/.version     — version tracking
#   scripts/               — portable bash utilities

set -euo pipefail

REPO="https://github.com/Fellowship-dev/flowchad.git"
TARGET=".flowchad"
TMP=$(mktemp -d)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [ ! -d "$TARGET" ]; then
  echo "Error: .flowchad/ not found — run install.sh first"
  exit 1
fi

echo ""
echo -e "${BOLD}Updating flowchad...${NC}"
echo ""

# Preserve current semver (bumping is a manual/release-time action)
CURRENT_VER="$(sed -n '1p' "$TARGET/.version" 2>/dev/null || echo "0.2.0")"

echo "Fetching latest from upstream..."
git clone --depth=1 --quiet "$REPO" "$TMP/flowchad"

LATEST_SHA=$(git -C "$TMP/flowchad" rev-parse HEAD)
LATEST_DATE=$(date -u +%Y-%m-%d)

# Update .flowchad subdirectories (skip protected paths)
for dir in skills commands knowledge templates; do
  if [ -d "$TMP/flowchad/.flowchad/$dir" ]; then
    rm -rf "$TARGET/$dir"
    cp -r "$TMP/flowchad/.flowchad/$dir" "$TARGET/$dir"
    echo -e "  ${GREEN}✓${NC} .flowchad/$dir/"
  fi
done

# Update .flowchad files (skip config.yml)
for file in .gitignore; do
  if [ -f "$TMP/flowchad/.flowchad/$file" ]; then
    cp "$TMP/flowchad/.flowchad/$file" "$TARGET/$file"
    echo -e "  ${GREEN}✓${NC} .flowchad/$file"
  fi
done

# Update root scripts/
if [ -d "$TMP/flowchad/scripts" ]; then
  mkdir -p scripts
  for script in "$TMP/flowchad/scripts"/*.sh; do
    [ -f "$script" ] || continue
    cp "$script" "scripts/$(basename "$script")"
    chmod +x "scripts/$(basename "$script")"
  done
  echo -e "  ${GREEN}✓${NC} scripts/"
fi

# Write updated .version
printf '%s\n%s\n%s\n' "$CURRENT_VER" "$LATEST_SHA" "$LATEST_DATE" > "$TARGET/.version"
echo -e "  ${GREEN}✓${NC} .flowchad/.version → ${LATEST_SHA:0:7} ($LATEST_DATE)"

echo ""
echo -e "${GREEN}${BOLD}flowchad updated!${NC}"
echo ""
echo -e "${YELLOW}Protected (unchanged):${NC}"
echo "  .flowchad/flows/       — your flow definitions"
echo "  .flowchad/config.yml   — your project config"
echo "  .flowchad/snapshots/   — walk results"
echo "  .flowchad/reports/     — generated reports"
echo ""
