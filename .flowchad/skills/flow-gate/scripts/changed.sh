#!/usr/bin/env bash
# changed.sh — which saved flows a change touches, so they are walked again
# before anyone is asked to test.
#
#   bash changed.sh [--base <git ref>] [--flows <dir>] [--walks <dir>]
#
# For each flow in .flowchad/flows (*.yml and *.map.md), the base is --base,
# or else the commit in the flow's latest walk record (.flowchad/walks/
# <date>-<id>.md, "- **Commit:** <sha>"), or else the commit at that record's
# walk time. Files changed since the base (committed, staged, unstaged and
# untracked) are matched against the flow's `covers:` globs, the flow file
# itself, and, as a weaker signal, the first path segment of its step URLs.
#
# Prints one line per flow:  walk|maybe|skip<TAB>id<TAB>reason
# Exit: 0 nothing to walk, 1 at least one flow to walk (walk or maybe), 2 usage.
# Portable: bash 3.2, POSIX awk, git.

set -u
BASE=""; FLOWS=".flowchad/flows"; WALKS=".flowchad/walks"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --base) BASE="${2:-}"; shift 2 ;;
    --flows) FLOWS="${2:-}"; shift 2 ;;
    --walks) WALKS="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "changed: unknown argument: $1" >&2; exit 2 ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "changed: not inside a git work tree" >&2; exit 2; }
[ -d "$FLOWS" ] || { echo "changed: no flows folder: $FLOWS" >&2; exit 2; }
if [ -n "$BASE" ] && ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null; then
  echo "changed: unknown base: $BASE" >&2; exit 2
fi

TMP=$(mktemp -d 2>/dev/null || mktemp -d -t flowchanged)
trap 'rm -rf "$TMP"' EXIT

# changed_since REF -> file list on stdout (paths relative to the repo root)
changed_since() {
  { git diff --name-only "$1" -- 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null; } | sort -u
}

# covers FILE -> one glob per line from a top-level `covers:` list
covers() {
  awk '
    /^covers:[ \t]*\[/ { s = $0; sub(/^covers:[ \t]*\[/, "", s); sub(/\].*/, "", s)
                         n = split(s, a, ","); for (i = 1; i <= n; i++) { g = a[i]; gsub(/^[ \t"'\'']+|[ \t"'\'']+$/, "", g); if (g != "") print g }; next }
    /^covers:/ { on = 1; next }
    on && /^[ \t]+-[ \t]+/ { g = $0; sub(/^[ \t]+-[ \t]+/, "", g); sub(/[ \t]+#.*/, "", g); gsub(/^["'\'']|["'\'']$/, "", g); print g; next }
    on && /^[^ \t#]/ { on = 0 }
  ' "$1"
}

# routes FILE -> first path segment of each step url (e.g. /signup/x -> signup)
routes() {
  awk '/^[ \t-]*url:[ \t]*\// { u = $0; sub(/^[ \t-]*url:[ \t]*\//, "", u); sub(/[\/?#" \t].*/, "", u); if (u != "") print u }' "$1" | sort -u
}

# base_for ID -> base commit for this flow, or empty when never walked
base_for() {
  [ -n "$BASE" ] && { echo "$BASE"; return; }
  [ -d "$WALKS" ] || return
  rec=$(ls "$WALKS" 2>/dev/null | grep -E "^[0-9]{4}-[0-9]{2}-[0-9]{2}-$1\.md$" | sort | tail -1)
  [ -n "$rec" ] || return
  sha=$(sed -n 's/^- \*\*Commit:\*\* \([0-9a-f]\{7,40\}\).*$/\1/p' "$WALKS/$rec" | head -1)
  if [ -n "$sha" ] && git rev-parse --verify --quiet "$sha^{commit}" >/dev/null; then echo "$sha"; return; fi
  when=$(sed -n 's/^- \*\*Walked:\*\* \(.*\)$/\1/p' "$WALKS/$rec" | head -1)
  [ -n "$when" ] && git rev-list -1 --before="$when" HEAD 2>/dev/null
}

need=0
found=0
for f in "$FLOWS"/*.yml "$FLOWS"/*.map.md; do
  [ -f "$f" ] || continue
  found=1
  name=$(basename "$f")
  case "$name" in *.map.md) id=${name%.map.md} ;; *) id=${name%.yml} ;; esac
  # a flow with both files is listed once, from its .yml
  case "$name" in *.map.md) [ -f "$FLOWS/$id.yml" ] && continue ;; esac

  base=$(base_for "$id")
  if [ -z "$base" ]; then
    printf 'walk\t%s\tnever walked\n' "$id"; need=1; continue
  fi
  changed_since "$base" > "$TMP/changed"
  short=$(git rev-parse --short "$base")

  hit=""
  if grep -qxF "${f#./}" "$TMP/changed"; then hit="flow file changed"; fi
  [ -z "$hit" ] && [ -f "$FLOWS/$id.map.md" ] && grep -qxF "${FLOWS#./}/$id.map.md" "$TMP/changed" && hit="flow map changed"
  if [ -z "$hit" ]; then
    covers "$f" > "$TMP/globs"
    while IFS= read -r file; do
      while IFS= read -r glob; do
        [ -n "$glob" ] || continue
        # shellcheck disable=SC2254
        case "$file" in $glob) hit="$file matches $glob"; break ;; esac
      done < "$TMP/globs"
      [ -n "$hit" ] && break
    done < "$TMP/changed"
  fi
  if [ -n "$hit" ]; then
    printf 'walk\t%s\t%s (since %s)\n' "$id" "$hit" "$short"; need=1; continue
  fi

  maybe=""
  for seg in $(routes "$f"); do
    m=$(grep -E "(^|/)${seg}([/._-]|$)" "$TMP/changed" | head -1)
    [ -n "$m" ] && { maybe="$m looks like route /$seg"; break; }
  done
  if [ -n "$maybe" ]; then
    printf 'maybe\t%s\t%s (since %s)\n' "$id" "$maybe" "$short"; need=1
  elif [ ! -s "$TMP/globs" ]; then
    printf 'maybe\t%s\tno covers: list, cannot tell (since %s)\n' "$id" "$short"; need=1
  else
    printf 'skip\t%s\tno covered file changed since %s\n' "$id" "$short"
  fi
done

[ "$found" = 1 ] || { echo "changed: no flows in $FLOWS" >&2; exit 2; }
exit "$need"
