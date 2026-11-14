#!/usr/bin/env bash
# upload_gate_test.sh — the evidence publishing gate in upload_evidence.sh.
# Offline. Run on macOS and Linux: bash tests/upload_gate_test.sh
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
UP="$ROOT/.flowchad/skills/evidence-upload/scripts/upload_evidence.sh"
T=$(mktemp -d 2>/dev/null || mktemp -d -t gatetest)
trap 'rm -rf "$T"' EXIT
failures=0

# gate NAME WANT_EXIT CONFIG_TEXT [ENV=VAL]
gate() {
  name="$1"; want="$2"; cfg="$3"; shift 3
  if [ "$cfg" = "-" ]; then rm -f "$T/config.yml"; else printf '%b' "$cfg" > "$T/config.yml"; fi
  out=$(env -u FLOWCHAD_UPLOAD_CONFIRMED FLOWCHAD_CONFIG="$T/config.yml" "$@" bash "$UP" --gate 2>&1); got=$?
  if [ "$got" = "$want" ]; then echo "ok   $name"; else echo "FAIL $name (exit $got, want $want): $out"; failures=$((failures + 1)); fi
}

gate "no config: stays local"            3 "-"
gate "default template (commented)"      3 "# evidence:\n#   backend: s3\n"
gate "backend none"                      3 "evidence:\n  backend: none\n"
gate "commented backend line"            3 "evidence:\n  # backend: s3\n  backend: none\n"
gate "s3 under another key"              3 "other:\n  backend: s3\nevidence:\n  backend: none\n"
gate "backend s3"                        0 "name: x\nevidence:\n  backend: s3   # opt in\n"
gate "backend quoted s3"                 0 "evidence:\n  backend: \"s3\"\n"
gate "confirmed for this run"            0 "-" FLOWCHAD_UPLOAD_CONFIRMED=1
gate "confirmation must be exactly 1"    3 "-" FLOWCHAD_UPLOAD_CONFIRMED=yes

# A real upload call without the gate stops before reading any secret.
rm -f "$T/config.yml"; : > "$T/shot.png"
out=$(env -u FLOWCHAD_UPLOAD_CONFIRMED FLOWCHAD_CONFIG="$T/config.yml" bash "$UP" "$T/shot.png" 2>&1); got=$?
if [ "$got" = 3 ] && printf '%s' "$out" | grep -q "evidence stays local"; then echo "ok   upload refused before secrets"; else echo "FAIL upload refused before secrets (exit $got): $out"; failures=$((failures + 1)); fi

echo
if [ "$failures" -eq 0 ]; then echo "all gate tests passed"; else echo "$failures gate test(s) failed"; fi
[ "$failures" -eq 0 ]
