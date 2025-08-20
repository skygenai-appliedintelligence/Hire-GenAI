# Requires: Git installed and available on PATH
# Usage examples:
#   .\MergeToMain.ps1 "feature-branch"
#   .\MergeToMain.ps1 "feature-branch" -NoFF -Push
# Wrapper available: MergeToMain "feature-branch" [-NoFF] [-Push]

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BranchName,

    [Parameter()] [switch]$NoFF,
    [Parameter()] [switch]$Push
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Run from repo root (.) where this file is placed
$ProjectDir = "."
$MainBranch = "main"

function Write-Info($msg) { Write-Host "[MergeToMain] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[MergeToMain] ERROR: $msg" -ForegroundColor Red }

# Ensure per-repo Git identity is configured
function Ensure-GitIdentity {
    $cfgName = (git config user.name 2>$null).Trim()
    $cfgEmail = (git config user.email 2>$null).Trim()

    if (-not $cfgName -or -not $cfgEmail) {
        Write-Info "Configuring Git identity for this repository..."
        $name = if ($cfgName) { $cfgName } else { $env:GIT_USER_NAME }
        $email = if ($cfgEmail) { $cfgEmail } else { $env:GIT_USER_EMAIL }
        if (-not $name)  { $name  = Read-Host "Enter Git user.name" }
        if (-not $email) { $email = Read-Host "Enter Git user.email" }
        if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
            throw "Git identity is required (user.name and user.email)."
        }
        git config user.name "$name"; if ($LASTEXITCODE -ne 0) { throw "Failed to set git user.name" }
        git config user.email "$email"; if ($LASTEXITCODE -ne 0) { throw "Failed to set git user.email" }
        Write-Info "Git identity set locally: $name <$email>"
    } else {
        Write-Info "Git identity detected: $cfgName <$cfgEmail>"
    }
}

try {
    if (-not (Test-Path -Path $ProjectDir -PathType Container)) { Write-Err "Project directory not found: $ProjectDir"; exit 1 }
    Write-Info "Switching to project directory: $ProjectDir"
    Set-Location -Path $ProjectDir

    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) { Write-Err "Not a Git repository: $ProjectDir"; exit 1 }

    Ensure-GitIdentity

    $originUrl = (git remote get-url origin 2>$null)
    if (-not $originUrl) { Write-Err "Remote 'origin' is not set. Run: git remote add origin <url>"; exit 1 }
    Write-Info "Origin: $originUrl"

    # Ensure branch exists locally or remotely
    Write-Info "Fetching latest from origin..."
    git fetch origin --prune
    if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

    # Ensure main exists
    if (-not (git show-ref --verify --quiet "refs/heads/$MainBranch")) {
        Write-Info "Creating local $MainBranch tracking origin/$MainBranch"
        git checkout -b $MainBranch --track "origin/$MainBranch"
        if ($LASTEXITCODE -ne 0) { throw "Failed to create local $MainBranch" }
    }

    # Switch to main and pull latest
    Write-Info "Checking out $MainBranch"
    git checkout $MainBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to checkout $MainBranch" }

    Write-Info "Pulling latest for $MainBranch"
    git pull --ff-only origin $MainBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to pull $MainBranch (consider resolving local changes)" }

    # Ensure source branch exists locally; if not, try to track remote
    if (-not (git show-ref --verify --quiet "refs/heads/$BranchName")) {
        Write-Info "Creating local branch $BranchName tracking origin/$BranchName"
        git checkout -b $BranchName --track "origin/$BranchName"
        if ($LASTEXITCODE -ne 0) { throw "Source branch $BranchName not found locally or on origin" }
    }

    # Switch back to main to merge
    git checkout $MainBranch | Out-Null

    # Merge
    $mergeArgs = @('merge', $BranchName)
    if ($NoFF) { $mergeArgs += '--no-ff' }
    Write-Info "Merging $BranchName into $MainBranch ..."
    git @mergeArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Merge failed. Resolve conflicts, commit, and re-run with -Push if desired."
        exit $LASTEXITCODE
    }

    # Optionally push
    if ($Push) {
        Write-Info "Pushing $MainBranch to origin ..."
        git push origin $MainBranch
        if ($LASTEXITCODE -ne 0) { Write-Err "Push failed."; exit $LASTEXITCODE }
    }

    Write-Info "Merge complete ✅ ($BranchName -> $MainBranch)"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
