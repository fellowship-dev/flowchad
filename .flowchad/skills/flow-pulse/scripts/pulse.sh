#!/usr/bin/env bash
# pulse.sh — cheap after-deploy check of each flow's key step, plain HTTP GETs only.
#
# Usage: bash pulse.sh [CHECKS_FILE]        (default: .flowchad/pulse.tsv)
#
# CHECKS_FILE: one check per line, tab-separated, '#' starts a comment:
#   flow-id <TAB> url <TAB> must-contain <TAB> must-not-contain
# must-contain / must-not-contain are fixed strings matched against the
# response body; either may be empty. Only GET is ever sent, so the pulse is
# safe against live systems as long as the URLs are not one-time or action
# links.
#
# Output: one timestamped line per check (UTC), then a summary.
# Exit: 0 all passed, 1 at least one failed, 2 usage error.
#
# Portable bash 3.2 + curl. No other dependencies.

set -u

CHECKS="${1:-.flowchad/pulse.tsv}"
if [ ! -f "$CHECKS" ]; then
  echo "pulse: checks file not found: $CHECKS" >&2
  exit 2
fi

TMP=$(mktemp -d 2>/dev/null || mktemp -d -t pulse)
trap 'rm -rf "$TMP"' EXIT

# Tabs are IFS whitespace, so `read` would merge an empty field with the next
# one. Split on the unit separator instead.
SEP=$(printf '\037')
tr '\t' "$SEP" < "$CHECKS" > "$TMP/checks"
pass=0
fail=0

while IFS="$SEP" read -r flow url must mustnot || [ -n "${flow:-}" ]; do
  case "$flow" in ''|'#'*) continue ;; esac
  if [ -z "${url:-}" ]; then
    echo "pulse: line for '$flow' has no url" >&2
    exit 2
  fi
  must="${must:-}"
  mustnot="${mustnot:-}"
  body="$TMP/body"
  : > "$body"

  code=$(curl -sS -L --max-time 20 -A "flowchad-pulse" \
    -o "$body" -w '%{http_code}' "$url" 2>"$TMP/err")
  [ -n "$code" ] || code="000"
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  reason=""
  case "$code" in
    2??) ;;
    000) reason="no response ($(head -c 120 "$TMP/err" | tr '\n' ' '))" ;;
    *)   reason="HTTP $code" ;;
  esac
  if [ -z "$reason" ] && [ -n "$must" ] && ! grep -qF -- "$must" "$body"; then
    reason="missing: \"$must\""
  fi
  if [ -z "$reason" ] && [ -n "$mustnot" ] && grep -qF -- "$mustnot" "$body"; then
    reason="found: \"$mustnot\""
  fi

  if [ -z "$reason" ]; then
    pass=$((pass + 1))
    echo "$ts PASS $flow ($code) $url"
  else
    fail=$((fail + 1))
    echo "$ts FAIL $flow — $reason — $url"
  fi
done < "$TMP/checks"

echo "pulse: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
