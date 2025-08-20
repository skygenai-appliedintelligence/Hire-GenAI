# Requires: Git installed and available on PATH
# Usage:
#   .\WhichBranchIamIn.ps1
#   # or via wrapper: .\WhichBranchIamIn.cmd

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = "."

function Write-Info($msg) { Write-Host "[WhichBranchIamIn] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[WhichBranchIamIn] ERROR: $msg" -ForegroundColor Red }

try {
    if (-not (Test-Path -Path $ProjectDir -PathType Container)) {
        Write-Err "Project directory not found: $ProjectDir"; exit 1
    }
    Set-Location -Path $ProjectDir

    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) { Write-Err "Not a Git repository: $ProjectDir"; exit 1 }

    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    $tracking = (git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null).Trim()

    # Dirty status
    git diff --quiet --ignore-submodules HEAD 2>$null
    $isDirty = ($LASTEXITCODE -ne 0)

    Write-Info ("Current branch: {0}" -f $branch)
    if ($tracking) { Write-Info ("Tracking     : {0}" -f $tracking) }
    else { Write-Info "Tracking     : (none)" }
    if ($isDirty) { Write-Info "Workspace    : dirty (uncommitted changes)" }
    else { Write-Info "Workspace    : clean" }

    exit 0
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
