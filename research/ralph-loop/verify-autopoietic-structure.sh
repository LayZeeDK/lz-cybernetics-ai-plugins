#!/usr/bin/env bash
# verify-autopoietic-structure.sh
#
# Externalized comparators for CYBERNETICS-ANALYSIS.md autopoietic structure.
# Each check verifies a structural property justified by a cybernetic principle
# documented within the file itself.
#
# Run from the repository root:
#   bash research/ralph-loop/verify-autopoietic-structure.sh
#
# Self-referential note: grep counts include +1 for patterns that appear inside
# the verification code block in the document (the document verifies itself).

set -euo pipefail

FILE="research/ralph-loop/CYBERNETICS-ANALYSIS.md"
FAILURES=0

check() {
  local label="$1"
  local principle="$2"
  local actual="$3"
  local operator="$4"
  local expected="$5"

  local passed=false

  case "$operator" in
    -ge) [ "$actual" -ge "$expected" ] && passed=true ;;
    -eq) [ "$actual" -eq "$expected" ] && passed=true ;;
    -lt) [ "$actual" -lt "$expected" ] && passed=true ;;
  esac

  if $passed; then
    printf "[OK]   %-45s %s (got %s, expected %s %s)\n" "$label" "$principle" "$actual" "$operator" "$expected"
  else
    printf "[FAIL] %-45s %s (got %s, expected %s %s)\n" "$label" "$principle" "$actual" "$operator" "$expected"
    FAILURES=$((FAILURES + 1))
  fi
}

if [ ! -f "$FILE" ]; then
  echo "[ERROR] File not found: $FILE"
  echo "Run this script from the repository root."
  exit 1
fi

echo "Autopoietic Structure Verification: $FILE"
echo "==========================================================="
echo ""

# Good Regulator Theorem: Map must model the document
map_rows=$(grep -c "^|" "$FILE" || true)
theory_subsections=$(grep -c "^### " "$FILE" || true)
check "Concept-to-Enhancement Map rows" "Good Regulator Theorem" "$map_rows" -ge 30 # table header + separator + data rows across multiple tables

# Requisite Variety: Tradition groups match cybernetic traditions
tradition_groups=$(grep -c "^### .*Enhancements$" "$FILE" || true)
check "Tradition group count" "Requisite Variety (Ashby)" "$tradition_groups" -eq 4

# Entailment Mesh: Cross-references are bidirectional
see_also=$(grep -c "See also:" "$FILE" || true)
check "See also cross-references" "Entailment Mesh (Pask)" "$see_also" -ge 10

applied_in=$(grep -c "Applied in:" "$FILE" || true)
check "Applied in forward references" "Entailment Mesh (Pask)" "$applied_in" -ge 8

maps_to=$(grep -c "Maps to:" "$FILE" || true)
check "Maps to backward references" "Entailment Mesh (Pask)" "$maps_to" -ge 8

# Channel Capacity: Key Insights compress the full document
bold_lines=$(grep -c "^\*\*" "$FILE" || true)
check "Key insight count < concept count" "Channel Capacity (Shannon)" "$bold_lines" -lt "$theory_subsections"

# Redundancy of Potential Command: Multiple paths to each concept
source_links=$(grep -c "^- \[" "$FILE" || true)
check "Source links provide independent paths" "Redundancy of Potential Command (Beer)" "$source_links" -ge 10

# POSIWID: Introduction describes actual structure
posiwid_terms=$(head -4 "$FILE" | grep -ci "patholog\|enhancement\|insight\|autopoietic" || true)
check "Introduction describes actual structure" "POSIWID (Beer)" "$posiwid_terms" -ge 1

# Negative Feedback: Pathologies cite principle violations
principle_violated=$(grep -c "Principle violated:" "$FILE" || true)
check "Pathology principle citations" "Negative Feedback (Wiener)" "$principle_violated" -ge 4

# Autopoiesis: Verification section exists and references itself
verification_section=$(grep -c "## Verification" "$FILE" || true)
check "Verification section exists" "Autopoiesis (Maturana/Varela)" "$verification_section" -ge 1

# Structural Determinism: Section ordering preserved
doc_arch_line=$(grep -n "^## Document Architecture" "$FILE" | head -1 | cut -d: -f1)
first_order_line=$(grep -n "^## First-Order" "$FILE" | head -1 | cut -d: -f1)
sources_line=$(grep -n "^## Sources" "$FILE" | head -1 | cut -d: -f1)
check "Document Architecture before First-Order" "Structural Determinism (Maturana)" "$doc_arch_line" -lt "$first_order_line"
check "Verification before Sources" "Structural Determinism (Maturana)" "$(grep -n "^## Verification" "$FILE" | head -1 | cut -d: -f1)" -lt "$sources_line"

echo ""
echo "==========================================================="
if [ "$FAILURES" -eq 0 ]; then
  echo "[SUCCESS] All checks passed. Autopoietic closure verified."
  exit 0
else
  echo "[FAIL] $FAILURES check(s) failed."
  exit 1
fi
