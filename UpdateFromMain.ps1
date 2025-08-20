# Requires: Git installed and available on PATH
# Bring main into your feature branch
# Usage examples:
#   .\UpdateFromMain.ps1                 # use current branch, merge main
#   .\UpdateFromMain.ps1 "Signup"        # specify branch
#   .\UpdateFromMain.ps1 -Rebase         # rebase current branch onto main
#   .\UpdateFromMain.ps1 "Signup" -Rebase -Push
# Wrapper available: UpdateFromMain [branch] [-Rebase] [-Push]

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$BranchName,

    [Parameter()] [switch]$Rebase,
    [Parameter()] [switch]$Push
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = "."
$MainBranch = "main"

function Write-Info($msg) { Write-Host "[UpdateFromMain] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[UpdateFromMain] ERROR: $msg" -ForegroundColor Red }

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

    Write-Info "Fetching latest from origin..."
    git fetch origin --prune
    if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

    # Determine effective branch
    if (-not $BranchName) { $BranchName = (git rev-parse --abbrev-ref HEAD).Trim() }
    if ([string]::IsNullOrWhiteSpace($BranchName) -or $BranchName -eq 'HEAD') { throw "Could not determine target branch." }
    Write-Info "Target branch: $BranchName"

    # Ensure main exists locally (check exit code, not output)
    git show-ref --verify --quiet "refs/heads/$MainBranch"
    $mainExists = ($LASTEXITCODE -eq 0)
    if (-not $mainExists) {
        Write-Info "Creating local $MainBranch tracking origin/$MainBranch"
        git checkout -b $MainBranch --track "origin/$MainBranch"
        if ($LASTEXITCODE -ne 0) { throw "Failed to create local $MainBranch" }
    }

    # Ensure target branch exists locally; if not, track remote
    git show-ref --verify --quiet "refs/heads/$BranchName"
    $branchExists = ($LASTEXITCODE -eq 0)
    if (-not $branchExists) {
        Write-Info "Creating local branch $BranchName tracking origin/$BranchName"
        git checkout -b $BranchName --track "origin/$BranchName"
        if ($LASTEXITCODE -ne 0) { throw "Branch $BranchName not found locally or on origin" }
    }

    # Update main
    Write-Info "Updating $MainBranch with latest"
    git checkout $MainBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to checkout $MainBranch" }
    git pull --ff-only origin $MainBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to pull $MainBranch (resolve local changes)" }

    # Switch to target branch
    Write-Info "Checking out $BranchName"
    git checkout $BranchName
    if ($LASTEXITCODE -ne 0) { throw "Failed to checkout $BranchName" }

    # Merge or rebase
    if ($Rebase) {
        Write-Info "Rebasing $BranchName onto $MainBranch ..."
        git rebase $MainBranch
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Rebase failed. Resolve conflicts, run 'git rebase --continue' or '--abort', then re-run."
            exit $LASTEXITCODE
        }
    } else {
        Write-Info "Merging $MainBranch into $BranchName ..."
        git merge --no-edit $MainBranch
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Merge failed. Resolve conflicts, commit, then re-run with -Push if desired."
            exit $LASTEXITCODE
        }
    }

    if ($Push) {
        Write-Info "Pushing $BranchName to origin ..."
        git push origin $BranchName
        if ($LASTEXITCODE -ne 0) { Write-Err "Push failed."; exit $LASTEXITCODE }
    }

    Write-Info "Branch updated ✅ ($MainBranch -> $BranchName)"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
