#!/usr/bin/env bash
# Detect i18n configuration and print supported locales to stdout.
# Output: space-separated locale codes, e.g. "en" or "en es fr"
# Exit 0 always; defaults to "en" if no i18n detected.

set -euo pipefail

PROJECT_DIR="${1:-.}"
DETECTED_LOCALES=""

# ── 1. Next.js i18n block in next.config.{js,mjs,ts,cjs} ──────────────────
for cfg in \
  "$PROJECT_DIR/next.config.js" \
  "$PROJECT_DIR/next.config.mjs" \
  "$PROJECT_DIR/next.config.ts" \
  "$PROJECT_DIR/next.config.cjs"; do
  if [ -f "$cfg" ]; then
    # Extract locales array: i18n: { locales: ['en', 'es', 'fr'] }
    locales=$(grep -A5 'i18n' "$cfg" 2>/dev/null \
      | grep -oP "(?<=locales:\s*\[)[^\]]*" \
      | tr -d "'" | tr -d '"' | tr ',' ' ' | tr -s ' ' | sed 's/^ //;s/ $//' \
      2>/dev/null || true)
    if [ -n "$locales" ]; then
      DETECTED_LOCALES="$locales"
      break
    fi
  fi
done

# ── 2. locales/ or messages/ directory (next-intl, i18next, etc.) ──────────
if [ -z "$DETECTED_LOCALES" ]; then
  for dir in "$PROJECT_DIR/locales" "$PROJECT_DIR/messages" "$PROJECT_DIR/public/locales" "$PROJECT_DIR/src/locales"; do
    if [ -d "$dir" ]; then
      # Subdirectory names are locale codes (en, es, fr-FR, etc.)
      subdirs=$(ls -1 "$dir" 2>/dev/null | grep -E '^[a-z]{2}(-[A-Z]{2})?$' | tr '\n' ' ' | sed 's/ $//' || true)
      if [ -n "$subdirs" ]; then
        DETECTED_LOCALES="$subdirs"
        break
      fi
      # JSON/YAML files at top level (en.json, es.json)
      files=$(ls -1 "$dir"/*.json "$dir"/*.yml "$dir"/*.yaml 2>/dev/null \
        | xargs -I{} basename {} \
        | grep -oE '^[a-z]{2}(-[A-Z]{2})?' \
        | sort -u | tr '\n' ' ' | sed 's/ $//' || true)
      if [ -n "$files" ]; then
        DETECTED_LOCALES="$files"
        break
      fi
    fi
  done
fi

# ── 3. Strapi: locale content types (admin/src/extensions or api/) ─────────
if [ -z "$DETECTED_LOCALES" ]; then
  if grep -r '"i18n"\|"locale"' "$PROJECT_DIR/config" 2>/dev/null | grep -q 'enabled.*true\|true.*enabled'; then
    # Strapi with i18n plugin enabled — locales stored in DB, can't auto-detect
    # Fall through to hreflang check
    :
  fi
fi

# ── 4. <link rel="alternate" hreflang=...> on production homepage ──────────
if [ -z "$DETECTED_LOCALES" ]; then
  # Try to find base URL from .flowchad/config.yml
  BASE_URL=""
  if [ -f "$PROJECT_DIR/.flowchad/config.yml" ]; then
    BASE_URL=$(grep -E '^url:' "$PROJECT_DIR/.flowchad/config.yml" 2>/dev/null \
      | head -1 | sed 's/url: *//' | tr -d '"' | tr -d "'" | sed 's/ *#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)
  fi
  if [ -n "$BASE_URL" ]; then
    hreflang=$(curl -s --max-time 5 "$BASE_URL" 2>/dev/null \
      | grep -oP 'hreflang="[^"]+"' \
      | grep -oP '(?<=hreflang=")[^"]+' \
      | grep -v 'x-default' \
      | sort -u | tr '\n' ' ' | sed 's/ $//' || true)
    if [ -n "$hreflang" ]; then
      DETECTED_LOCALES="$hreflang"
    fi
  fi
fi

# ── Output ─────────────────────────────────────────────────────────────────
if [ -z "$DETECTED_LOCALES" ]; then
  echo "en"
else
  echo "$DETECTED_LOCALES"
fi
