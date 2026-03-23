#!/bin/bash
# Flowchad installer — drop-in AI QA for any web project
# Usage: curl -fsSL https://raw.githubusercontent.com/Fellowship-dev/flowchad/main/install.sh | bash

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

# Check if already installed
if [ -d ".flowchad" ]; then
  echo -e "${YELLOW}.flowchad/ already exists.${NC} Updating..."
  cd .flowchad
  git pull origin main 2>/dev/null || echo -e "${YELLOW}Not a git repo — skipping update.${NC}"
  cd ..
else
  echo "Installing to .flowchad/..."
  git clone https://github.com/Fellowship-dev/flowchad.git .flowchad 2>/dev/null
fi

# Add to .gitignore if not already there
if [ -f ".gitignore" ]; then
  if ! grep -q "^\.flowchad/$" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Flowchad (AI QA)" >> .gitignore
    echo ".flowchad/" >> .gitignore
    echo -e "${GREEN}✓${NC} Added .flowchad/ to .gitignore"
  fi
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
echo -e "${GREEN}${BOLD}Flowchad installed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .flowchad/config.yml with your project URL"
echo "  2. Define flows in .flowchad/flows/ (or run /flowchad-setup)"
echo "  3. Walk a flow: /flow-walk sign-up"
echo "  4. Get a report: /flow-report sign-up"
echo ""
