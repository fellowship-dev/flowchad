#!/bin/bash
# Flowchad installer — scaffold project data directory
# Usage: curl -fsSL https://raw.githubusercontent.com/Fellowship-dev/flowchad/main/install.sh | bash
#
# This creates .flowchad/ with config.yml and flows/ — your project's flow data.
# For the skills (flow-walk, flow-add, etc.), run: npx skills add Fellowship-dev/flowchad --skill '*'

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}Flowchad${NC} — drop-in AI QA for any web project"
echo ""

# Check we're in a project directory
if [ ! -d ".git" ] && [ ! -f "package.json" ] && [ ! -f "Gemfile" ] && [ ! -f "pyproject.toml" ]; then
  echo -e "${YELLOW}Warning:${NC} This doesn't look like a project root (no .git, package.json, Gemfile, or pyproject.toml)."
  echo -n "Continue anyway? [y/N] "
  read -r answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "Aborted."
    exit 1
  fi
fi

# Create project data directory
if [ -d ".flowchad/flows" ]; then
  echo -e "${YELLOW}.flowchad/ already exists.${NC} Skipping scaffold."
else
  echo "Creating .flowchad/..."
  mkdir -p .flowchad/flows

  # Create default config if not present
  if [ ! -f ".flowchad/config.yml" ]; then
    PROJECT_NAME=$(basename "$(pwd)")
    cat > .flowchad/config.yml <<YAML
name: ${PROJECT_NAME}
url: http://localhost:3000
type: website

timing:
  slow: 3
  critical: 10
YAML
    echo -e "${GREEN}✓${NC} Created .flowchad/config.yml"
  fi

  echo -e "${GREEN}✓${NC} Created .flowchad/flows/"
fi

# Check for ffmpeg (optional, for video)
if command -v ffmpeg &>/dev/null; then
  echo -e "${GREEN}✓${NC} ffmpeg found — video recording enabled"
else
  echo -e "${YELLOW}○${NC} ffmpeg not found — video recording will be skipped (install with: brew install ffmpeg)"
fi

# Check for Chrome/Chromium
if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] || \
   [ -f "/Applications/Chromium.app/Contents/MacOS/Chromium" ] || \
   command -v chromium &>/dev/null || \
   command -v google-chrome &>/dev/null; then
  echo -e "${GREEN}✓${NC} Chrome/Chromium found"
else
  echo -e "${YELLOW}○${NC} Chrome/Chromium not found — needed for Playwright CDP"
fi

echo ""
echo -e "${GREEN}${BOLD}Flowchad project data initialized!${NC}"
echo ""
echo "Next steps:"
echo "  1. Install skills:  npx skills add Fellowship-dev/flowchad --skill '*'"
echo "  2. Edit .flowchad/config.yml with your project URL"
echo "  3. Run /flowchad-setup to auto-discover flows"
echo "  4. Or define flows manually in .flowchad/flows/"
echo "  5. Walk a flow: /flow-walk sign-up"
echo ""
echo -e "${BOLD}Important:${NC} .flowchad/ contains shared project knowledge — commit it to git."
echo ""
