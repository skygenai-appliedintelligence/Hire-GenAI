# Requires: Git installed and available on PATH
# Usage:
#   .\SwitchBranch.ps1 "feature/my-branch"
#   # or via wrapper: .\SwitchBranch.cmd "feature/my-branch"

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BranchName
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = "."

function Write-Info($msg) { Write-Host "[SwitchBranch] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[SwitchBranch] ERROR: $msg" -ForegroundColor Red }

try {
    if (-not (Test-Path -Path $ProjectDir -PathType Container)) {
        Write-Err "Project directory not found: $ProjectDir"
        exit 1
    }

    Write-Info "Switching to project directory: $ProjectDir"
    Set-Location -Path $ProjectDir

    # Validate Git repo
    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) { Write-Err "Not a Git repository: $ProjectDir"; exit 1 }

    $Branch = $BranchName.Trim()
    if ([string]::IsNullOrWhiteSpace($Branch)) { Write-Err "Branch name cannot be empty"; exit 1 }

    # Ensure branch exists locally; otherwise check remote to guide the user
    git show-ref --verify --quiet "refs/heads/$Branch" 2>$null
    $localExists = ($LASTEXITCODE -eq 0)
    if ($localExists) {
        Write-Info "Checking out existing local branch: $Branch"
        git checkout "$Branch"
        if ($LASTEXITCODE -ne 0) { Write-Err "Checkout failed."; exit $LASTEXITCODE }
    }
    else {
        # Does it exist on origin? If so, instruct to use CreateBranch to track; else error
        git ls-remote --exit-code --heads origin "$Branch" *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Err "Branch '$Branch' exists on origin but not locally. Use CreateBranch to create a local tracking branch: .\\CreateBranch.ps1 '$Branch'"
            exit 2
        }
        else {
            Write-Err "Branch '$Branch' does not exist locally or on origin. Create it first with: .\\CreateBranch.ps1 '$Branch'"
            exit 3
        }
    }

    Write-Info "Now on branch: $(git rev-parse --abbrev-ref HEAD)"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
