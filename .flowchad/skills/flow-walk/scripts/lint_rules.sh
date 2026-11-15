#!/usr/bin/env bash
# lint_rules.sh — check FlowChad rule files against the mechanical part of the
# admission test (rules/README.md § Admission test).
#
#   bash lint_rules.sh                 # the shipped rules, plus .flowchad/rules if present
#   bash lint_rules.sh DIR [DIR ...]   # these rule folders (each with a CHANGELOG.md)
#
# FLOWCHAD_FORBIDDEN_TERMS=<file> adds private terms (one per line) to the
# shipped forbidden-terms.txt without publishing them.
# Exit: 0 all rules pass, 1 a rule fails, 2 usage (no rule files found).
# Portable: bash 3.2 and POSIX awk (macOS and Linux).

set -u
HERE=$(cd "$(dirname "$0")" && pwd)
SHIPPED="$HERE/../rules"
MEASURES="$HERE/../references/measures.md"

if [ "$#" -gt 0 ]; then
  DIRS=("$@")
else
  DIRS=("$SHIPPED")
  [ -d ".flowchad/rules" ] && DIRS+=(".flowchad/rules")
fi

TERMS="$SHIPPED/forbidden-terms.txt"
EXTRA=${FLOWCHAD_FORBIDDEN_TERMS:-}
if [ -n "$EXTRA" ] && [ ! -f "$EXTRA" ]; then
  echo "lint_rules: FLOWCHAD_FORBIDDEN_TERMS file not found: $EXTRA" >&2; exit 2
fi
[ -f "$MEASURES" ] || { echo "lint_rules: measures reference not found: $MEASURES" >&2; exit 2; }

FILES=()
CHANGELOGS=()
for d in "${DIRS[@]}"; do
  [ -d "$d" ] || { echo "lint_rules: not a folder: $d" >&2; exit 2; }
  [ -f "$d/CHANGELOG.md" ] || { echo "$d: missing CHANGELOG.md" >&2; exit 1; }
  CHANGELOGS+=("$d/CHANGELOG.md")
  for f in "$d"/*.md; do
    case "$(basename "$f")" in README.md|CHANGELOG.md) continue ;; esac
    [ -f "$f" ] && FILES+=("$f")
  done
done
[ "${#FILES[@]}" -gt 0 ] || { echo "lint_rules: no rule files in: ${DIRS[*]}" >&2; exit 2; }

awk -v terms_file="$TERMS" -v extra_file="$EXTRA" -v measures_file="$MEASURES" '
function err(msg) { printf "%s:%d: %s%s\n", FILENAME, FNR, (cur != "" ? cur ": " : ""), msg; errors++ }
function rerr(id, msg) { printf "%s: %s: %s\n", file_of[id], id, msg; errors++ }
function dirof(p,   q) { q = p; sub(/\/[^\/]*$/, "", q); return q }
function norm(s) { s = tolower(s); gsub(/[^a-z0-9.]+/, " ", s); gsub(/\.( |$)/, " ", s); return " " s " " }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
function load_terms(path,   line) {
  if (path == "") return
  while ((getline line < path) > 0) {
    line = trim(line)
    if (line == "" || substr(line, 1, 1) == "#") continue
    nterms++; term[nterms] = norm(line); term_raw[nterms] = line
  }
  close(path)
}
function check_terms(text, what,   i) {
  text = norm(text)
  for (i = 1; i <= nterms; i++)
    if (index(text, term[i]) > 0) err(what " contains a product-specific term: " term_raw[i])
}
function finish(   n, w, s, i, parts, k, ok, nf, has_source, field_ok) {
  if (cur == "") return
  if (!(cur in seen_rule) ) seen_rule[cur] = 1
  # required single fields
  split("Rule Check Severity Applies Pass Fail Since", req, " ")
  for (i = 1; i <= 7; i++) {
    k = req[i]
    if (cnt[cur, k] == 0) rerr(cur, "missing " (k == "Applies" ? "Applies to" : k))
    else if (cnt[cur, k] > 1) rerr(cur, "more than one " (k == "Applies" ? "Applies to" : k))
  }
  if (cnt[cur, "Basis"] == 0) rerr(cur, "missing Basis")
  # rule: one sentence, at most 45 words
  s = val[cur, "Rule"]
  if (s != "") {
    w = split(s, parts, /[ \t]+/)
    if (w > 45) rerr(cur, "Rule has " w " words (at most 45)")
    if (s !~ /\.$/) rerr(cur, "Rule must be one sentence ending with a period")
    n = gsub(/[.!?]( |$)/, "&", s)
    if (n != 1) rerr(cur, "Rule must be one sentence (found " n " sentence ends)")
  }
  if (val[cur, "Severity"] != "" && val[cur, "Severity"] !~ /^(blocker|should-fix|later)$/)
    rerr(cur, "Severity must be blocker, should-fix or later")
  if (val[cur, "Applies"] != "") {
    nf = split(val[cur, "Applies"], parts, /, */)
    for (i = 1; i <= nf; i++)
      if (parts[i] !~ /^(step|flow|map|docs|agent)$/) rerr(cur, "Applies to: unknown scope \"" parts[i] "\"")
  }
  if (val[cur, "Since"] != "" && val[cur, "Since"] !~ /^[0-9]+\.[0-9]+\.[0-9]+$/) rerr(cur, "Since must be a version like 0.5.0")
  if (val[cur, "Pass"] != "" && val[cur, "Pass"] == val[cur, "Fail"]) rerr(cur, "Pass and Fail examples are identical")
  has_source = (nsource[cur] > 0)
  field_ok = (field_flows[cur] >= 2)
  if (cnt[cur, "Basis"] > 0 && !has_source && !field_ok)
    rerr(cur, "Basis needs a cited source with a link, or a field note of failures in at least 2 independent flows")
  if (cnt[cur, "Threshold"] > 0 && !has_source) rerr(cur, "a Threshold needs a cited source basis")
  if (cnt[cur, "Retired"] > 0) retired[cur] = 1
  cur = ""
}
BEGIN {
  load_terms(terms_file); load_terms(extra_file)
  while ((getline line < measures_file) > 0)
    if (line ~ /^\| `[a-z_]+` \|/) { m = line; sub(/^\| `/, "", m); sub(/`.*/, "", m); measure[m] = 1 }
  close(measures_file)
}
FILENAME ~ /CHANGELOG\.md$/ { clog[dirof(FILENAME)] = clog[dirof(FILENAME)] " " $0 " "; next }
FNR == 1 {
  finish()
  prefix = ""
  if ($0 ~ /^<!-- prefix: [A-Z]+ -->$/) { prefix = $3 } else { cur = ""; err("first line must be <!-- prefix: NAME -->") }
}
{
  plain = $0; gsub(/<https?:[^>]*>/, "", plain)   # links may carry ISBNs and DOIs
  if (plain ~ /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z][A-Za-z]+/) err("contains an email address")
  if (plain ~ /[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/) err("contains a 12-digit number (account-like)")
}
/^### / {
  finish()
  h = substr($0, 5)
  if (h !~ /^[A-Z]+-[0-9][0-9] · [^ ].*/) { err("heading must be \"### PREFIX-NN · Title\""); next }
  cur = substr(h, 1, index(h, " ") - 1)
  title = h; sub(/^[A-Z]+-[0-9][0-9] · /, "", title)
  idpre = cur; sub(/-.*/, "", idpre)
  if (prefix != "" && idpre != prefix) err("id prefix " idpre " does not match file prefix " prefix)
  if (cur in file_of) { printf "%s:%d: %s: duplicate id (first in %s)\n", FILENAME, FNR, cur, file_of[cur]; errors++ }
  else { file_of[cur] = FILENAME; order[++nrules] = cur; dir_of[cur] = dirof(FILENAME) }
  check_terms(title, "title")
  lastkey = ""
  next
}
cur != "" && /^- \*\*[A-Za-z ]+:\*\* / {
  k = $0; sub(/^- \*\*/, "", k); v = substr(k, index(k, ":** ") + 4); sub(/:\*\* .*/, "", k)
  v = trim(v)
  if (k == "Applies to") k = "Applies"
  if (k == "Replaced by") k = "ReplacedBy"
  if (k !~ /^(Rule|Check|Measure|Threshold|Severity|Applies|Basis|Pass|Fail|Since|Replaces|Retired|ReplacedBy)$/) { err("unknown field: " k); next }
  cnt[cur, k]++
  if (k != "Basis") val[cur, k] = v
  lastkey = k
  if (k == "Rule" || k == "Check" || k == "Pass" || k == "Fail") check_terms(v, k)
  if (k == "Basis") {
    if (v ~ /^source — /) {
      if (v ~ /<https?:\/\/[^ >]+>/) nsource[cur]++
      else err("source basis needs a link in <https://...>")
    } else if (v ~ /^field — /) {
      if (v !~ /maintainer field note/) err("field basis must say \"maintainer field note\" and name no person, client or product")
      if (match(v, /[0-9]+ (flows?|screens?|walks?) in [0-9]+ products?/)) {
        f = substr(v, RSTART, RLENGTH); split(f, fp, " ")
        if (fp[2] ~ /^flow/ && fp[1] + 0 > field_flows[cur] + 0) field_flows[cur] = fp[1] + 0
      } else err("field basis needs a count: \"N flows in M products\"")
    } else err("Basis must start with \"source — \" or \"field — \"")
  }
  if (k == "Measure") {
    nm = split(v, ms, /, */)
    for (i = 1; i <= nm; i++) { mm = ms[i]; gsub(/`/, "", mm); if (!(mm in measure)) err("unknown measure: " mm) }
  }
  if (k == "Threshold") {
    if (v !~ /^`[a-z_]+ (=|<=|>=|<|>) (-?[0-9.]+|true|false)( when [a-z_]+ (=|<=|>=|<|>) -?[0-9.]+)?`$/) err("Threshold syntax: `measure op value [when measure op number]`")
    else { t = v; gsub(/`/, "", t); nt = split(t, tp, " "); if (!(tp[1] in measure)) err("unknown measure in Threshold: " tp[1]); if (nt > 3 && !(tp[5] in measure)) err("unknown measure in Threshold: " tp[5]) }
  }
  if (k == "Retired" && v !~ /^[0-9]+\.[0-9]+\.[0-9]+ — .+/) err("Retired must be \"<version> — <reason>\"")
  if (k == "Replaces") replaces[cur] = v
  if (k == "ReplacedBy") replacedby[cur] = v
  next
}
cur != "" && /^  +[^ ]/ && lastkey != "" { err("a field must fit on one line"); next }
END {
  finish()
  active = 0
  for (i = 1; i <= nrules; i++) {
    id = order[i]
    if (clog[dir_of[id]] !~ ("[^A-Z0-9-]" id "[^0-9]")) rerr(id, "not named in " dir_of[id] "/CHANGELOG.md")
    if (id in replaces) {
      r = replaces[id]
      if (!(r in file_of)) rerr(id, "Replaces " r ", which does not exist")
      else if (!(r in retired)) rerr(id, "Replaces " r ", which is not retired")
    }
    if (id in replacedby) { r = replacedby[id]; if (!(r in file_of)) rerr(id, "Replaced by " r ", which does not exist"); else if (r in retired) rerr(id, "Replaced by " r ", which is itself retired") }
    if (!(id in retired)) active++
  }
  if (errors > 0) { printf "\n%d problem(s) in %d rule(s)\n", errors, nrules; exit 1 }
  printf "%d rules (%d active, %d retired): admission lint passed\n", nrules, active, nrules - active
}
' "${CHANGELOGS[@]}" "${FILES[@]}"
