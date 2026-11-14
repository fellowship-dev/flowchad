#!/usr/bin/env bash
# pulse_test.sh — behaviour matrix for flow-pulse/scripts/pulse.sh.
# Run on macOS (bash 3.2, BSD tools) and Linux (bash 5, GNU tools):
#   bash tests/pulse_test.sh
# Needs network access to example.com and github.com (plain GETs).

set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PULSE="$ROOT/.flowchad/skills/flow-pulse/scripts/pulse.sh"
T=$(mktemp -d 2>/dev/null || mktemp -d -t pulsetest)
trap 'rm -rf "$T"' EXIT
failures=0

# expect NAME WANT_EXIT WANT_TEXT FILE
expect() {
  name="$1"; want="$2"; text="$3"; file="$4"
  out=$(bash "$PULSE" "$file" 2>&1); got=$?
  if [ "$got" = "$want" ] && printf '%s' "$out" | grep -qF -- "$text"; then
    echo "ok   $name"
  else
    echo "FAIL $name (exit $got, want $want; wanted text: $text)"
    printf '%s\n' "$out" | sed 's/^/     /'
    failures=$((failures + 1))
  fi
}

printf 'home\thttps://example.com/\tExample Domain\n' > "$T/pass.tsv"
expect "content present passes" 0 "1 passed, 0 failed" "$T/pass.tsv"

printf 'home\thttps://example.com/\tChoose a time\n' > "$T/missing.tsv"
expect "missing text fails" 1 'missing: "Choose a time"' "$T/missing.tsv"

printf 'home\thttps://example.com/\t\tExample Domain\n' > "$T/forbidden.tsv"
expect "empty middle field keeps must-not-contain" 1 'found: "Example Domain"' "$T/forbidden.tsv"

printf 'gone\thttps://example.com/definitely-missing-flowchad\t\t\n' > "$T/404.tsv"
expect "404 fails" 1 "HTTP 404" "$T/404.tsv"

printf 'home\thttps://example.com/\tExample' > "$T/nonl.tsv"
expect "last line without newline is read" 0 "1 passed" "$T/nonl.tsv"

printf 'home\thttps://example.com/\tExample Domain\r\n' > "$T/crlf.tsv"
expect "CRLF line endings" 0 "1 passed" "$T/crlf.tsv"

printf 'home\thttps://example.com/\ta\tb\tc\n' > "$T/five.tsv"
expect "five fields rejected" 2 "more than four" "$T/five.tsv"

: > "$T/empty.tsv"
expect "empty file is a usage error" 2 "no checks" "$T/empty.tsv"

printf '# only a comment\n\n' > "$T/comments.tsv"
expect "comment-only file is a usage error" 2 "no checks" "$T/comments.tsv"

expect "missing file is a usage error" 2 "not found" "$T/does-not-exist.tsv"

printf 'local\tfile:///etc/hosts\tlocalhost\n' > "$T/file.tsv"
expect "file:// is refused" 1 "curl exit" "$T/file.tsv"

printf 'dead\thttps://flowchad-pulse-test.invalid/\t\t\n' > "$T/dns.tsv"
expect "unreachable host fails with curl exit" 1 "curl exit" "$T/dns.tsv"

printf 'redirect\thttps://www.github.com/\t\t\n' > "$T/redirect.tsv"
expect "final URL after redirect is shown" 0 "https://github.com/" "$T/redirect.tsv"

echo
if [ "$failures" -eq 0 ]; then echo "all pulse tests passed"; else echo "$failures pulse test(s) failed"; fi
[ "$failures" -eq 0 ]
