#!/usr/bin/env bash
# pulse.sh — cheap after-deploy check of each flow's key step, plain HTTP GETs only.
#
# Usage: bash pulse.sh [CHECKS_FILE]        (default: .flowchad/pulse.tsv)
#
# CHECKS_FILE: one check per line, tab-separated, '#' starts a comment:
#   flow-id <TAB> url <TAB> must-contain <TAB> must-not-contain
# must-contain / must-not-contain are fixed strings matched against the raw
# response body (HTML or JSON as served, not the rendered page); either may be
# empty. Only GET over http/https is sent, so the pulse is safe against live
# systems as long as the URLs are not one-time or action links.
#
# Output: one UTC-timestamped line per check, showing the final URL after
# redirects, then a summary.
# Exit: 0 every check passed
#       1 at least one check failed
#       2 usage error: missing or malformed checks file, or no checks in it
#
# Portable bash 3.2+ and curl. No other dependencies.

set -u

CHECKS="${1:-.flowchad/pulse.tsv}"
if [ ! -f "$CHECKS" ]; then
  echo "pulse: checks file not found: $CHECKS" >&2
  exit 2
fi

TMP=$(mktemp -d 2>/dev/null || mktemp -d -t pulse)
trap 'rm -rf "$TMP"' EXIT

# Tabs are IFS whitespace, so `read` would merge an empty field with the next
# one. Split on the unit separator instead, and drop CR from CRLF files.
SEP=$(printf '\037')
tr -d '\r' < "$CHECKS" | tr '\t' "$SEP" > "$TMP/checks"
pass=0
fail=0
lineno=0

while IFS="$SEP" read -r flow url must mustnot extra || [ -n "${flow:-}" ]; do
  lineno=$((lineno + 1))
  case "$flow" in ''|'#'*) continue ;; esac
  if [ -z "${url:-}" ]; then
    echo "pulse: line $lineno ('$flow') has no url" >&2
    exit 2
  fi
  if [ -n "${extra:-}" ]; then
    echo "pulse: line $lineno ('$flow') has more than four tab-separated fields" >&2
    exit 2
  fi
  must="${must:-}"
  mustnot="${mustnot:-}"
  body="$TMP/body"
  : > "$body"

  out=$(curl -sS -L --proto '=http,https' --proto-redir '=http,https' \
    --max-time 20 -A "flowchad-pulse" \
    -o "$body" -w '%{http_code} %{url_effective}' "$url" 2>"$TMP/err")
  rc=$?
  code="${out%% *}"
  final="${out#* }"
  [ -n "$code" ] || code="000"
  [ -n "$final" ] && [ "$final" != "$out" ] || final="$url"
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  reason=""
  if [ "$rc" -ne 0 ]; then
    reason="curl exit $rc ($(head -c 120 "$TMP/err" | tr '\n' ' '))"
  else
    case "$code" in
      2??) ;;
      *)   reason="HTTP $code" ;;
    esac
  fi
  if [ -z "$reason" ] && [ -n "$must" ] && ! grep -qF -- "$must" "$body"; then
    reason="missing: \"$must\""
  fi
  if [ -z "$reason" ] && [ -n "$mustnot" ] && grep -qF -- "$mustnot" "$body"; then
    reason="found: \"$mustnot\""
  fi

  if [ -z "$reason" ]; then
    pass=$((pass + 1))
    echo "$ts PASS $flow ($code) $final"
  else
    fail=$((fail + 1))
    echo "$ts FAIL $flow — $reason — $final"
  fi
done < "$TMP/checks"

if [ $((pass + fail)) -eq 0 ]; then
  echo "pulse: no checks in $CHECKS" >&2
  exit 2
fi
echo "pulse: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
