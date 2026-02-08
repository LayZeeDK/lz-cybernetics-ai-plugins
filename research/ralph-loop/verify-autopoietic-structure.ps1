# verify-autopoietic-structure.ps1
#
# Externalized comparators for CYBERNETICS-ANALYSIS.md autopoietic structure.
# Each check verifies a structural property justified by a cybernetic principle
# documented within the file itself.
#
# Run from the repository root:
#   pwsh research/ralph-loop/verify-autopoietic-structure.ps1
#
# Self-referential note: pattern counts include +1 for patterns that appear
# inside the verification code block in the document (the document verifies
# itself).

$ErrorActionPreference = "Stop"

$File = "research/ralph-loop/CYBERNETICS-ANALYSIS.md"
$Failures = 0

function Test-Check {
    param(
        [string]$Label,
        [string]$Principle,
        [int]$Actual,
        [string]$Operator,
        [int]$Expected
    )

    $passed = switch ($Operator) {
        "-ge" { $Actual -ge $Expected }
        "-eq" { $Actual -eq $Expected }
        "-lt" { $Actual -lt $Expected }
    }

    $status = if ($passed) { "[OK]  " } else { "[FAIL]" }
    $msg = "{0} {1,-45} {2} (got {3}, expected {4} {5})" -f $status, $Label, $Principle, $Actual, $Operator, $Expected
    Write-Host $msg

    if (-not $passed) {
        $script:Failures++
    }
}

if (-not (Test-Path $File)) {
    Write-Host "[ERROR] File not found: $File"
    Write-Host "Run this script from the repository root."
    exit 1
}

$Content = Get-Content $File
$LineCount = $Content.Count

Write-Host "Autopoietic Structure Verification: $File"
Write-Host "==========================================================="
Write-Host ""

# Good Regulator Theorem: Map must model the document
$mapRows = ($Content | Select-String -Pattern "^\|").Count
$theorySubsections = ($Content | Select-String -Pattern "^### ").Count
Test-Check "Concept-to-Enhancement Map rows" "Good Regulator Theorem" $mapRows "-ge" 30

# Requisite Variety: Tradition groups match cybernetic traditions
$traditionGroups = ($Content | Select-String -Pattern "^### .*Enhancements$").Count
Test-Check "Tradition group count" "Requisite Variety (Ashby)" $traditionGroups "-eq" 4

# Entailment Mesh: Cross-references are bidirectional
$seeAlso = ($Content | Select-String -Pattern "See also:").Count
Test-Check "See also cross-references" "Entailment Mesh (Pask)" $seeAlso "-ge" 10

$appliedIn = ($Content | Select-String -Pattern "Applied in:").Count
Test-Check "Applied in forward references" "Entailment Mesh (Pask)" $appliedIn "-ge" 8

$mapsTo = ($Content | Select-String -Pattern "Maps to:").Count
Test-Check "Maps to backward references" "Entailment Mesh (Pask)" $mapsTo "-ge" 8

# Channel Capacity: Key Insights compress the full document
$boldLines = ($Content | Select-String -Pattern "^\*\*").Count
Test-Check "Key insight count < concept count" "Channel Capacity (Shannon)" $boldLines "-lt" $theorySubsections

# Redundancy of Potential Command: Multiple paths to each concept
$sourceLinks = ($Content | Select-String -Pattern "^- \[").Count
Test-Check "Source links provide independent paths" "Redundancy of Potential Command (Beer)" $sourceLinks "-ge" 10

# POSIWID: Introduction describes actual structure
$introLines = $Content | Select-Object -First 4
$poswidTerms = ($introLines | Select-String -Pattern "patholog|enhancement|insight|autopoietic").Count
Test-Check "Introduction describes actual structure" "POSIWID (Beer)" $poswidTerms "-ge" 1

# Negative Feedback: Pathologies cite principle violations
$principleViolated = ($Content | Select-String -Pattern "Principle violated:").Count
Test-Check "Pathology principle citations" "Negative Feedback (Wiener)" $principleViolated "-ge" 4

# Autopoiesis: Verification section exists and references itself
$verificationSection = ($Content | Select-String -Pattern "^## Verification").Count
Test-Check "Verification section exists" "Autopoiesis (Maturana/Varela)" $verificationSection "-ge" 1

# Structural Determinism: Section ordering preserved
$headings = $Content | Select-String -Pattern "^## " | ForEach-Object { $_.LineNumber }
$docArchLine = ($Content | Select-String -Pattern "^## Document Architecture" | Select-Object -First 1).LineNumber
$firstOrderLine = ($Content | Select-String -Pattern "^## First-Order" | Select-Object -First 1).LineNumber
$verifyLine = ($Content | Select-String -Pattern "^## Verification" | Select-Object -First 1).LineNumber
$sourcesLine = ($Content | Select-String -Pattern "^## Sources" | Select-Object -First 1).LineNumber
Test-Check "Document Architecture before First-Order" "Structural Determinism (Maturana)" $docArchLine "-lt" $firstOrderLine
Test-Check "Verification before Sources" "Structural Determinism (Maturana)" $verifyLine "-lt" $sourcesLine

Write-Host ""
Write-Host "==========================================================="

if ($Failures -eq 0) {
    Write-Host "[SUCCESS] All checks passed. Autopoietic closure verified."
    exit 0
} else {
    Write-Host "[FAIL] $Failures check(s) failed."
    exit 1
}
