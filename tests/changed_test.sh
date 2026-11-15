#!/usr/bin/env bash
# changed_test.sh — flow-gate/scripts/changed.sh in a scratch git repository.
# Offline. Run on macOS and Linux: bash tests/changed_test.sh
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHANGED="$ROOT/.flowchad/skills/flow-gate/scripts/changed.sh"
T=$(mktemp -d 2>/dev/null || mktemp -d -t changedtest)
trap 'rm -rf "$T"' EXIT
failures=0

check() { # NAME WANT_EXIT WANT_LINE_REGEX [ARGS...]
  name="$1"; want="$2"; re="$3"; shift 3
  out=$(cd "$T/repo" && bash "$CHANGED" "$@" 2>&1); got=$?
  if [ "$got" = "$want" ] && printf '%s\n' "$out" | grep -Eq -- "$re"; then echo "ok   $name"
  else echo "FAIL $name (exit $got, want $want; wanted /$re/)"; printf '%s\n' "$out" | sed 's/^/     /'; failures=$((failures + 1)); fi
}

mkdir -p "$T/repo" && cd "$T/repo" || exit 1
git init -q . && git config user.email t@t.invalid && git config user.name t && git config commit.gpgsign false
mkdir -p .flowchad/flows .flowchad/walks app/signup app/billing docs
cat > .flowchad/flows/new-user-signs-up.yml <<'EOF'
name: New user signs up
goal: Account exists
value_moment: The dashboard shows the first result
covers:
  - app/signup/*
  - "docs/install*"   # quoted, with a comment
url: /signup
steps:
  - action: navigate
    url: /signup
EOF
cat > .flowchad/flows/person-pays.yml <<'EOF'
name: Person pays
goal: Paid
covers: [app/billing/*]
url: /checkout
steps:
  - action: navigate
    url: /checkout
EOF
cat > .flowchad/flows/no-covers.yml <<'EOF'
name: Reads the pricing page
goal: Knows the price
steps:
  - action: navigate
    url: /pricing
EOF
echo a > app/signup/form.tsx; echo b > app/billing/plan.tsx; echo c > docs/guide.md
git add -A && git commit -qm base
BASE=$(git rev-parse HEAD)

check "never walked" 1 "^walk	new-user-signs-up	never walked"

for id in new-user-signs-up person-pays no-covers; do
  printf '# Walk record: %s\n\n- **Walked:** 2026-11-15T10:00:00-03:00\n- **Commit:** %s\n' "$id" "$BASE" > ".flowchad/walks/2026-11-15-$id.md"
done
git add -A && git commit -qm records
check "nothing changed since the walk" 1 "^skip	new-user-signs-up	no covered file changed"
check "flow without covers is maybe" 1 "^maybe	no-covers	no covers"

echo changed >> app/signup/form.tsx
check "uncommitted change to a covered file" 1 "^walk	new-user-signs-up	app/signup/form.tsx matches app/signup/\*"
check "other flow untouched" 1 "^skip	person-pays"
git commit -qam "signup change"

echo new > docs/install-linux.md   # untracked, quoted glob
git add app && git commit -qm noop --allow-empty
check "untracked file matches a quoted glob" 1 "^walk	new-user-signs-up	(app/signup/form.tsx|docs/install-linux.md) matches"
rm docs/install-linux.md

echo x > app/billing/plan.tsx && git commit -qam billing
check "inline covers list" 1 "^walk	person-pays	app/billing/plan.tsx matches app/billing/\*"

mkdir -p app/pricing && echo p > app/pricing/page.tsx && git add -A && git commit -qm pricing
check "route segment is a maybe" 1 "^maybe	no-covers	app/pricing/page.tsx looks like route /pricing"

# a newer record moves the base forward
NOW=$(git rev-parse HEAD)
for id in new-user-signs-up person-pays no-covers; do
  printf '# Walk record: %s\n\n- **Walked:** 2026-11-16T10:00:00-03:00\n- **Commit:** %s\n' "$id" "$NOW" > ".flowchad/walks/2026-11-16-$id.md"
done
git add -A && git commit -qm "new records"
check "latest record is the base" 1 "^skip	person-pays	no covered file changed since"
out=$(cd "$T/repo" && bash "$CHANGED" --base "$NOW" 2>&1 | grep -c '^walk'); [ "$out" = 0 ] && echo "ok   explicit base" || { echo "FAIL explicit base ($out walk lines)"; failures=$((failures + 1)); }
echo "tags: [onboarding]" >> .flowchad/flows/new-user-signs-up.yml
check "flow file edit is a walk" 1 "^walk	new-user-signs-up	flow file changed"
check "unknown base is a usage error" 2 "unknown base" --base nope
check "missing flows folder is a usage error" 2 "no flows folder" --flows does/not/exist

echo
if [ "$failures" -eq 0 ]; then echo "all changed tests passed"; else echo "$failures changed test(s) failed"; fi
[ "$failures" -eq 0 ]
