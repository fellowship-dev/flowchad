#!/usr/bin/env bash
# rules_lint_test.sh — the rule admission lint (flow-walk/scripts/lint_rules.sh).
# Offline. Run on macOS (bash 3.2, BWK awk) and Linux: bash tests/rules_lint_test.sh
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LINT="$ROOT/.flowchad/skills/flow-walk/scripts/lint_rules.sh"
T=$(mktemp -d 2>/dev/null || mktemp -d -t lintest)
trap 'rm -rf "$T"' EXIT
failures=0

ok()   { echo "ok   $1"; }
fail() { echo "FAIL $1"; printf '%s\n' "$2" | sed 's/^/     /'; failures=$((failures + 1)); }

# The shipped rules pass.
out=$(bash "$LINT" "$ROOT/.flowchad/skills/flow-walk/rules" 2>&1); got=$?
if [ "$got" = 0 ] && printf '%s' "$out" | grep -q "admission lint passed"; then ok "shipped rules pass"; else fail "shipped rules pass (exit $got)" "$out"; fi

GOOD='- **Rule:** The one input a step needs is visible without scrolling.
- **Check:** Measure the scroll before the primary element at each width; fail if any scroll is needed.
- **Measure:** `scroll_before_primary_vh`
- **Threshold:** `scroll_before_primary_vh = 0`
- **Severity:** blocker
- **Applies to:** step
- **Basis:** source — Example Source, "An article" (2020), <https://example.com/article> (checked 2026-11-15): the article says the input must be visible.
- **Threshold source:** <https://example.com/article> (checked 2026-11-15): the zero comes from the article.
- **Pass:** A setup step shows its input at the top.
- **Fail:** A setup step shows a report above its input.
- **Since:** 0.5.0'

# case NAME WANT_EXIT WANT_TEXT RULE_FILE_BODY [CHANGELOG_BODY]
case_() {
  name="$1"; want="$2"; text="$3"; body="$4"; clog="${5:-X-01 X-02 X-03}"
  d="$T/$name"; rm -rf "$d"; mkdir -p "$d"
  printf '%s\n' "$body" > "$d/x.md"
  printf '# changelog\n- %s\n' "$clog" > "$d/CHANGELOG.md"
  out=$(env -u FLOWCHAD_FORBIDDEN_TERMS bash "$LINT" "$d" 2>&1); got=$?
  if [ "$got" = "$want" ] && printf '%s' "$out" | grep -qF -- "$text"; then ok "$name"; else fail "$name (exit $got, want $want; wanted: $text)" "$out"; fi
}

case_ "valid rule passes" 0 "1 rules (1 active" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD"

case_ "missing prefix line" 1 "first line must be" "### X-01 · Visible input

$GOOD"

case_ "id prefix must match file" 1 "does not match file prefix" "<!-- prefix: Y -->
### X-01 · Visible input

$GOOD"

case_ "duplicate id" 1 "duplicate id" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD

### X-01 · Again

$GOOD"

case_ "missing basis" 1 "missing Basis" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | grep -v Basis | grep -v Threshold)"

case_ "source without a link" 1 "needs a link" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/, <https:\/\/example.com\/article>//')"

case_ "field note from one flow is not enough" 1 "at least 2 independent flows" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | grep -v Threshold | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 1 flow in 1 product (maintainer field note, 2026-11; FN-0001)./')"

case_ "field note from two flows is enough" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | grep -v Threshold | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-0001, FN-0002)./')"

case_ "two screens of one flow are not two flows" 1 "at least 2 independent flows" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | grep -v Threshold | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed on 2 screens in 1 product (maintainer field note, 2026-11; FN-0001)./')"

case_ "field note must not name its origin" 1 "maintainer field note" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | grep -v Threshold | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (seen by a client; FN-0001, FN-0002)./')"

case_ "threshold needs a source" 1 "Threshold needs a cited source" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 3 flows in 2 products (maintainer field note, 2026-11; FN-0001, FN-0002, FN-0003)./')"

case_ "bad threshold syntax" 1 "Threshold syntax" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/= 0`/is zero`/')"

case_ "unknown measure" 1 "unknown measure" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^- \*\*Measure:\*\* .*/- **Measure:** `vibes`/')"

case_ "bad severity" 1 "Severity must be" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/blocker/critical/')"

case_ "unknown scope" 1 "unknown scope" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/Applies to:\*\* step/Applies to:** screen/')"

case_ "rule must be one sentence" 1 "one sentence" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/without scrolling\./without scrolling. Always./')"

case_ "missing fail example" 1 "missing Fail" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | grep -v '^- \*\*Fail')"

case_ "product name in the rule" 1 "product-specific term: stripe" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows a report/The Stripe page shows a report/')"

case_ "vendor named in a basis is fine" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/Example Source/Google research/')"

case_ "email address" 1 "email address" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/A setup step for a@example.com shows its input/')"

case_ "account-like number" 1 "12-digit number" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/Account 123456789012 shows its input/')"

case_ "not in the changelog" 1 "not named in" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD" "nothing here"

case_ "replaces a rule that is not retired" 1 "which is not retired" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD

### X-02 · Visible input, narrower

$GOOD
- **Replaces:** X-01"

case_ "replaces a retired rule" 0 "2 rules (1 active, 1 retired)" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD
- **Retired:** 0.6.0 — replaced by X-02 after a better source.
- **Replaced by:** X-02

### X-02 · Visible input, narrower

$GOOD
- **Replaces:** X-01"

case_ "unknown field" 1 "unknown field: Owner" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD
- **Owner:** someone"

# ---- review fixes: each case failed before the fix ----
FIELD2='- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-0001, FN-0002).'
NOTHR=$(printf '%s\n' "$GOOD" | grep -v Threshold)

# private_case NAME WANT_EXIT WANT_TEXT RULE_BODY [CHANGELOG] [EXTRA_FILE_NAME EXTRA_FILE_BODY]
private_case() {
  name="$1"; want="$2"; text="$3"; body="$4"; clog="${5:-- X-01}"
  d="$T/$name"; rm -rf "$d"; mkdir -p "$d"
  printf '%s\n' "$body" > "$d/x.md"
  printf '# changelog\n%s\n' "$clog" > "$d/CHANGELOG.md"
  [ -n "${6:-}" ] && printf '%s\n' "$7" > "$d/$6"
  printf 'acmecorp\n' > "$T/private-terms.txt"
  out=$(FLOWCHAD_FORBIDDEN_TERMS="$T/private-terms.txt" bash "$LINT" "$d" 2>&1); got=$?
  if [ "$got" = "$want" ] && printf '%s' "$out" | grep -qF -- "$text"; then ok "$name"; else fail "$name (exit $got, want $want; wanted: $text)" "$out"; fi
}

private_case "C1 private term in a field basis line" 1 "Basis contains a product-specific term: acmecorp" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in the Acmecorp portal (maintainer field note, 2026-11; FN-0001, FN-0002)./')"

case_ "C1 vendor in a source claim fails" 1 "Basis claim contains a product-specific term: stripe" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/: the article says the input must be visible\./: the Stripe checkout does it./')"

case_ "C1 vendor as the cited author passes" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/Example Source/Stripe Press/')"

for v in "Acme-Corp" "Acme Corp" "AcmeCorps" "ACME.corp"; do
  private_case "C2 variant $v" 1 "product-specific term: acmecorp" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed "s/A setup step shows its input/The $v portal shows its input/")"
done
for v in "Cloud-flare" "Cloud flare" "Stripes" "Next js"; do
  case_ "C2 variant $v" 1 "product-specific term" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed "s/A setup step shows its input/A $v page shows its input/")"
done

private_case "C3 term in group intro prose" 1 "text contains a product-specific term: acmecorp" "<!-- prefix: X -->
# Group

Seen first in the Acmecorp portal.

### X-01 · Visible input

$GOOD"

private_case "C3 term in the CHANGELOG" 1 "CHANGELOG contains a product-specific term: acmecorp" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD" "- X-01, from the Acmecorp walk"

private_case "C3 term in a README" 1 "README.md contains a product-specific term: acmecorp" "<!-- prefix: X -->
### X-01 · Visible input

$GOOD" "- X-01" "README.md" "Rules seeded from Acmecorp."

case_ "C4 number in the Rule without a threshold source" 1 "needs a Threshold source line" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/without scrolling\./within 3 seconds./')"

case_ "C4 number in the Check with only a field basis" 1 "needs a cited source basis" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/fail if any scroll is needed/fail above 2 screens/' | sed "s|^- \*\*Basis:\*\* source.*|$FIELD2|")"

case_ "C4 threshold source must be one of the rule's sources" 1 "not one of the rule source bases" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's|^- \*\*Threshold source:\*\* <https://example.com/article>|- **Threshold source:** <https://example.com/other>|')"

case_ "C4 number with a declared threshold source passes" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/without scrolling\./within 3 seconds./')"

case_ "C5 hyphenated account number" 1 "12-digit number" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/Account 1234-5678-9012 shows its input/')"

case_ "C5 spaced account number" 1 "12-digit number" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/Account 1234 5678 9012 shows its input/')"

case_ "C6 field basis without a field-note id" 1 "needs a field-note id" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11)./')"

case_ "C6 two flows need two ids" 1 "lists 1 field-note id" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-0001, FN-0001)./')"

case_ "F source basis must record when it was checked" 1 "(checked YYYY-MM-DD)" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/ (checked 2026-11-15): the article says/: the article says/')"

# ---- second review: placeholder values the lint accepted before ----
src_date() { printf '%s\n' "$GOOD" | sed "s/^\(- \*\*Basis:\*\* source.*\)(checked 2026-11-15)/\1(checked $1)/"; }
for c in "9999-99-99|not a real calendar date" "2026-02-30|not a real calendar date" "2099-01-01|in the future" "2019-12-31|before 2020"; do
  dt=${c%%|*}; want=${c#*|}
  case_ "G source checked $dt" 1 "$want" "<!-- prefix: X -->
### X-01 · Visible input

$(src_date "$dt")"
done
case_ "G threshold source date in the future" 1 "Threshold source checked date is in the future" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^\(- \*\*Threshold source:\*\* .*\)(checked 2026-11-15)/\1(checked 2031-01-01)/')"
case_ "G a date checked today passes" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(src_date "$(date -u +%Y-%m-%d)")"
case_ "G source line with no claim" 1 "needs a claim of at least 4 words" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/(checked 2026-11-15): the article says the input must be visible\./(checked 2026-11-15)./')"
case_ "G source line with a one-word claim" 1 "needs a claim of at least 4 words" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/(checked 2026-11-15): the article says the input must be visible\./(checked 2026-11-15): yes./')"
case_ "G threshold source with only a link" 1 "Threshold source needs a claim" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^- \*\*Threshold source:\*\* .*/- **Threshold source:** <https:\/\/example.com\/article> (checked 2026-11-15)/')"
case_ "G threshold source with a one-character claim" 1 "Threshold source needs a claim" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^- \*\*Threshold source:\*\* .*/- **Threshold source:** <https:\/\/example.com\/article> (checked 2026-11-15): x/')"
case_ "G threshold source without a check date" 1 "Threshold source must say when" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^- \*\*Threshold source:\*\* .*/- **Threshold source:** <https:\/\/example.com\/article>: the zero comes from the article./')"
case_ "G a tool standard with its reason and citation passes" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed "s/^- \*\*Threshold source:\*\* .*/- **Threshold source:** tool standard: zero is the tool's own standard, motivated by <https:\/\/example.com\/article> (checked 2026-11-15)./")"
case_ "G a tool standard without a reason fails" 1 "tool-standard Threshold source needs its reason" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/^- \*\*Threshold source:\*\* .*/- **Threshold source:** tool standard: <https:\/\/example.com\/article> (checked 2026-11-15)./')"
case_ "G a tool standard must still cite a rule source" 1 "not one of the rule source bases" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed "s/^- \*\*Threshold source:\*\* .*/- **Threshold source:** tool standard: zero is the tool's own standard, motivated by <https:\/\/example.com\/other> (checked 2026-11-15)./")"
case_ "G field-note id zero" 1 "FN-0000 is not an id" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-0000, FN-0002)./')"
case_ "G date-shaped field-note id" 1 "must be a sequence number FN-NNNN: FN-2026-11-01" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2026-11; FN-2026-11-01, FN-0002)./')"
case_ "G field note month in the future" 1 "field note month date is in the future" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$NOTHR" | sed 's/^- \*\*Basis:\*\* source.*/- **Basis:** field — failed in 2 flows in 1 product (maintainer field note, 2099-11; FN-0001, FN-0002)./')"
private_case "G -es plural of a private term" 1 "product-specific term: acmecorp" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/Two Acmecorpes show their input/')"
case_ "G -es plural of a shipped term" 1 "product-specific term: paypal" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/Two PayPales show their input/')"
out=$(FLOWCHAD_LINT_TODAY=2026-11-01 bash "$LINT" "$ROOT/.flowchad/skills/flow-walk/rules" 2>&1); got=$?
if [ "$got" = 1 ] && printf '%s' "$out" | grep -q "in the future"; then ok "G shipped rules checked after the run date fail"; else fail "G shipped rules checked after the run date fail (exit $got)" "$out"; fi

# D: the shipped list holds vendor and brand names only
for t in dkim dmarc spf dns "mx record" "txt record"; do
  if grep -qix "$t" "$ROOT/.flowchad/skills/flow-walk/rules/forbidden-terms.txt"; then fail "D shipped list has no generic term: $t" "found"; else ok "D shipped list has no generic term: $t"; fi
done
case_ "D a generic protocol term is allowed" 0 "admission lint passed" "<!-- prefix: X -->
### X-01 · Visible input

$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/A DNS setup step shows its input/')"

# A private term list is applied without being published.
d="$T/private"; mkdir -p "$d"
printf '<!-- prefix: X -->\n### X-01 · Visible input\n\n%s\n' "$(printf '%s\n' "$GOOD" | sed 's/A setup step shows its input/The Acmecorp portal shows its input/')" > "$d/x.md"
printf -- '- X-01\n' > "$d/CHANGELOG.md"
printf 'acmecorp\n' > "$T/private-terms.txt"
out=$(FLOWCHAD_FORBIDDEN_TERMS="$T/private-terms.txt" bash "$LINT" "$d" 2>&1); got=$?
if [ "$got" = 1 ] && printf '%s' "$out" | grep -q "acmecorp"; then ok "private forbidden terms"; else fail "private forbidden terms (exit $got)" "$out"; fi

out=$(bash "$LINT" "$T/does-not-exist" 2>&1); got=$?
if [ "$got" = 2 ]; then ok "missing folder is a usage error"; else fail "missing folder is a usage error (exit $got)" "$out"; fi

echo
if [ "$failures" -eq 0 ]; then echo "all rules lint tests passed"; else echo "$failures rules lint test(s) failed"; fi
[ "$failures" -eq 0 ]
