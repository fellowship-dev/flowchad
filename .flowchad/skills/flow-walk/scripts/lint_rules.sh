#!/usr/bin/env bash
# lint_rules.sh — check FlowChad rule files against the mechanical part of the
# admission test (rules/README.md § Admission test).
#
#   bash lint_rules.sh                 # the shipped rules, plus .flowchad/rules if present
#   bash lint_rules.sh DIR [DIR ...]   # these rule folders (each with a CHANGELOG.md)
#
# Every text file in each folder is checked: rule files (*.md), README.md,
# CHANGELOG.md and any other .md/.txt/.yml/.json file. forbidden-terms.txt is
# the only file exempt from the term check.
#
# FLOWCHAD_FORBIDDEN_TERMS=<file> adds private terms (one per line) to the
# shipped forbidden-terms.txt without publishing them. Terms and text are
# compared after normalising both sides: lowercase, punctuation and spaces
# removed, an optional trailing "s" (so Acme-Corp, Acme Corp and AcmeCorps all
# match acmecorp).
# Dates in "(checked YYYY-MM-DD)" must be real calendar dates, not before
# 2020 and not after the run date (UTC, one day of slack for time zones);
# FLOWCHAD_LINT_TODAY=YYYY-MM-DD sets the run date (for tests).
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
TODAY=${FLOWCHAD_LINT_TODAY:-$(date -u +%Y-%m-%d)}
case "$TODAY" in [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;; *) echo "lint_rules: bad FLOWCHAD_LINT_TODAY: $TODAY" >&2; exit 2 ;; esac
[ -f "$MEASURES" ] || { echo "lint_rules: measures reference not found: $MEASURES" >&2; exit 2; }

FILES=()
PROSE=()
CHANGELOGS=()
for d in "${DIRS[@]}"; do
  [ -d "$d" ] || { echo "lint_rules: not a folder: $d" >&2; exit 2; }
  [ -f "$d/CHANGELOG.md" ] || { echo "$d: missing CHANGELOG.md" >&2; exit 1; }
  CHANGELOGS+=("$d/CHANGELOG.md")
  for f in "$d"/*; do
    [ -f "$f" ] || continue
    case "$(basename "$f")" in
      CHANGELOG.md|forbidden-terms.txt) continue ;;
      README.md) PROSE+=("$f") ;;
      *.md) FILES+=("$f") ;;
      *.txt|*.yml|*.yaml|*.json|*.csv) PROSE+=("$f") ;;
    esac
  done
done
[ "${#FILES[@]}" -gt 0 ] || { echo "lint_rules: no rule files in: ${DIRS[*]}" >&2; exit 2; }

LC_ALL=C awk -v terms_file="$TERMS" -v extra_file="$EXTRA" -v measures_file="$MEASURES" -v today="$TODAY" '
function err(msg) { printf "%s:%d: %s%s\n", FILENAME, FNR, (cur != "" ? cur ": " : ""), msg; errors++ }
function rerr(id, msg) { printf "%s: %s: %s\n", file_of[id], id, msg; errors++ }
function dirof(p,   q) { q = p; sub(/\/[^\/]*$/, "", q); return q }
function base(p,   q) { q = p; sub(/.*\//, "", q); return q }
function tnorm(s) { s = tolower(s); gsub(/[^a-z0-9]/, "", s); return s }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
function nolinks(s) { gsub(/<[a-z]+:[^>]*>/, "", s); gsub(/\]\([^)]*\)/, "]", s); gsub(/[a-z]+:\/\/[^ )>]+/, "", s); return s }
function load_terms(path,   line, t) {
  if (path == "") return
  while ((getline line < path) > 0) {
    line = trim(line)
    if (line == "" || substr(line, 1, 1) == "#") continue
    t = tnorm(line); if (t == "") continue
    tset[t] = line; nterms++
  }
  close(path)
}
function term_hit(g,   b) {
  if (g in tset) return tset[g]
  if (length(g) > 2 && substr(g, length(g), 1) == "s") { b = substr(g, 1, length(g) - 1); if (b in tset) return tset[b] }
  if (length(g) > 4 && substr(g, length(g) - 1, 2) == "es") { b = substr(g, 1, length(g) - 2); if (b in tset) return tset[b] }
  if (length(g) > 3 && ((g "s") in tset)) return tset[g "s"]
  return ""
}
# Day number of a calendar date, or -1 if it is not a real date.
function daynum(s,   y, m, d, mdays, mp) {
  if (s !~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/) return -1
  y = substr(s, 1, 4) + 0; m = substr(s, 6, 2) + 0; d = substr(s, 9, 2) + 0
  if (m < 1 || m > 12 || d < 1) return -1
  split("31 28 31 30 31 30 31 31 30 31 30 31", mdays, " ")
  if (m == 2 && ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0)) mdays[2] = 29
  if (d > mdays[m] + 0) return -1
  if (m <= 2) { y--; mp = m + 9 } else mp = m - 3
  return 365 * y + int(y / 4) - int(y / 100) + int(y / 400) + int((153 * mp + 2) / 5) + d
}
# A checked date must be real, not before 2020 and not after today (+1 day).
function check_date(s, what,   n) {
  n = daynum(s)
  if (n < 0) { err(what " date is not a real calendar date: " s); return }
  if (n < daynum("2020-01-01")) err(what " date is before 2020: " s)
  else if (n > daynum(today) + 1) err(what " date is in the future: " s)
}
# Words in a claim: tokens with a letter or digit.
function nwords(s,   n, parts, i, c) {
  n = split(s, parts, /[ \t]+/); c = 0
  for (i = 1; i <= n; i++) if (parts[i] ~ /[A-Za-z0-9]/) c++
  return c
}
# Words are compared one by one and joined in runs of up to three, so a term
# split by a hyphen, a dot or a space ("Cloud-flare", "Next js") still matches.
function check_terms(text, what,   n, parts, i, j, g, hit, seen) {
  if (nterms == 0) return
  n = split(tolower(text), parts, /[^a-z0-9]+/)
  split("", seen)
  for (i = 1; i <= n; i++) {
    if (parts[i] == "") continue
    g = ""
    for (j = i; j <= n && j < i + 3; j++) {
      if (parts[j] == "") break
      g = g parts[j]
      hit = term_hit(g)
      if (hit != "" && !(hit in seen)) { seen[hit] = 1; err(what " contains a product-specific term: " hit) }
    }
  }
}
# Text checks for every line of every file: email addresses and account-like
# numbers (12 or more digits, also when grouped with spaces or hyphens).
function check_line(line,   plain, s, r, d) {
  plain = line; gsub(/<https?:[^>]*>/, "", plain)   # links may carry ISBNs and DOIs
  if (plain ~ /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z][A-Za-z]+/) err("contains an email address")
  s = plain
  while (match(s, /[0-9]([0-9]|[ -][0-9])*/)) {
    r = substr(s, RSTART, RLENGTH); d = r; gsub(/[^0-9]/, "", d)
    if (length(d) >= 12) { err("contains a 12-digit number (account-like): " r); break }
    s = substr(s, RSTART + RLENGTH)
  }
}
function finish(   n, w, s, i, parts, k, has_source) {
  if (cur == "") return
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
  if (cnt[cur, "Basis"] > 0 && !has_source && field_flows[cur] < 2)
    rerr(cur, "Basis needs a cited source with a link, or a field note of failures in at least 2 independent flows")
  if (cnt[cur, "Threshold"] > 0 && !has_source) rerr(cur, "a Threshold needs a cited source basis")
  if (numeric[cur]) {
    if (!has_source) rerr(cur, "a number in the Rule or Check needs a cited source basis (field notes do not set numbers)")
    if (cnt[cur, "TSource"] == 0) rerr(cur, "a number in the Rule, Check or Threshold needs a Threshold source line naming the cited source it comes from")
  }
  if (cnt[cur, "TSource"] > 0) {
    if (tslink[cur] == "") rerr(cur, "Threshold source needs a link in <https://...>")
    else if (!((cur, tslink[cur]) in srclink)) rerr(cur, "Threshold source links to " tslink[cur] ", which is not one of the rule source bases")
  }
  if (cnt[cur, "Retired"] > 0) retired[cur] = 1
  cur = ""
}
BEGIN {
  load_terms(terms_file); load_terms(extra_file)
  while ((getline line < measures_file) > 0)
    if (line ~ /^\| `[a-z_]+` \|/) { m = line; sub(/^\| `/, "", m); sub(/`.*/, "", m); measure[m] = 1 }
  close(measures_file)
}
FILENAME ~ /CHANGELOG\.md$/ {
  clog[dirof(FILENAME)] = clog[dirof(FILENAME)] " " $0 " "
  check_line($0); check_terms(nolinks($0), "CHANGELOG"); next
}
base(FILENAME) == "README.md" || base(FILENAME) !~ /\.md$/ {
  check_line($0); check_terms(nolinks($0), base(FILENAME)); next
}
FNR == 1 {
  finish()
  prefix = ""
  if ($0 ~ /^<!-- prefix: [A-Z]+ -->$/) { prefix = $3 } else { cur = ""; err("first line must be <!-- prefix: NAME -->") }
}
{ check_line($0) }
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
  if (k == "Threshold source") k = "TSource"
  if (k !~ /^(Rule|Check|Measure|Threshold|TSource|Severity|Applies|Basis|Pass|Fail|Since|Replaces|Retired|ReplacedBy)$/) { err("unknown field: " k); next }
  cnt[cur, k]++
  if (k != "Basis") val[cur, k] = v
  lastkey = k
  if (k == "Rule" || k == "Check" || k == "Pass" || k == "Fail") check_terms(v, k)
  if (k == "Rule" || k == "Check") { nb = v; gsub(/`[^`]*`/, "", nb); if (nb ~ /[0-9]/) numeric[cur] = 1 }
  if (k == "Threshold") numeric[cur] = 1
  if (k == "TSource") {
    check_terms(nolinks(v), "Threshold source")
    if (match(v, /<https?:\/\/[^ >]+>/)) {
      tslink[cur] = substr(v, RSTART + 1, RLENGTH - 2)
      rest = substr(v, RSTART + RLENGTH)
      if (match(rest, /^ \(checked [^)]*\)/)) check_date(substr(rest, 11, 10), "Threshold source checked")
      else err("Threshold source must say when the link was checked: <link> (checked YYYY-MM-DD)")
    }
    claim = v; tool = 0
    if (claim ~ /^tool standard: /) { tool = 1; sub(/^tool standard: /, "", claim) }
    gsub(/<[a-z]+:[^>]*>/, "", claim); gsub(/\(checked [^)]*\)/, "", claim)
    if (nwords(claim) < 4) err(tool ? "a tool-standard Threshold source needs its reason in at least 4 words" : "Threshold source needs a claim of at least 4 words saying what the source gives")
  }
  if (k == "Basis") {
    if (v ~ /^source — /) {
      # the cited work (author and title) and its link are exempt; the claim is not
      if (match(v, /<https?:\/\/[^ >]+>/)) {
        nsource[cur]++; srclink[cur, substr(v, RSTART + 1, RLENGTH - 2)] = 1
        claim = substr(v, RSTART + RLENGTH)
        check_terms(claim, "Basis claim")
        if (match(claim, /^ \(checked [^)]*\)/)) {
          check_date(substr(claim, 11, 10), "source basis checked")
          said = substr(claim, RSTART + RLENGTH); sub(/^:/, "", said)
          if (nwords(said) < 4) err("source basis needs a claim of at least 4 words after the date, saying what the source supports")
        } else err("source basis must say when the link was opened and checked: <link> (checked YYYY-MM-DD)")
      } else err("source basis needs a link in <https://...>")
    } else if (v ~ /^field — /) {
      fv = v; sub(/^field — /, "", fv); check_terms(fv, "Basis")
      if (v !~ /maintainer field note/) err("field basis must say \"maintainer field note\" and name no person, client or product")
      # one field-note id per observation; the observation itself is recorded privately by the maintainer
      ids = v; nid = 0; split("", idseen)
      while (match(ids, /FN-[0-9A-Za-z-]*/)) {
        fid = substr(ids, RSTART, RLENGTH); sub(/-+$/, "", fid); ids = substr(ids, RSTART + RLENGTH)
        if (fid !~ /^FN-[0-9][0-9][0-9][0-9]$/) { err("field-note id must be a sequence number FN-NNNN: " fid); continue }
        if (fid == "FN-0000") { err("field-note id FN-0000 is not an id"); continue }
        if (!(fid in idseen)) { idseen[fid] = 1; nid++ }
      }
      if (match(v, /maintainer field note, [0-9][0-9][0-9][0-9]-[0-9][0-9]/)) check_date(substr(v, RSTART + RLENGTH - 7, 7) "-01", "field note month")
      if (nid == 0) err("field basis needs a field-note id for each observation (FN-NNNN)")
      if (match(v, /[0-9]+ (flows?|screens?|walks?) in [0-9]+ products?/)) {
        f = substr(v, RSTART, RLENGTH); split(f, fp, " ")
        if (fp[2] ~ /^flow/) {
          if (nid < fp[1] + 0) err("field basis counts " fp[1] " flows but lists " nid " field-note id(s); list one per flow")
          else if (fp[1] + 0 > field_flows[cur] + 0) field_flows[cur] = fp[1] + 0
        }
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
# everything else in a rule file (group intro prose, the group title) is text
{ check_terms(nolinks($0), "text") }
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
' "${CHANGELOGS[@]}" ${PROSE[@]+"${PROSE[@]}"} "${FILES[@]}"
