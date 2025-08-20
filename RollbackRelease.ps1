# Requires: Git installed and available on PATH
# Roll back a release by deleting a tag and (optionally) reverting the merge commit on main
# Usage examples:
#   .\RollbackRelease.ps1 -Tag v20250820-120000                 # delete local tag
#   .\RollbackRelease.ps1 -Tag v1.2.3 -DeleteRemote             # delete local + remote tag
#   .\RollbackRelease.ps1 -Tag v1.2.3 -RevertMerge              # revert the tag's commit on main (merge-safe)
#   .\RollbackRelease.ps1 -Tag v1.2.3 -RevertMerge -DeleteRemote -Push
# Wrapper: RollbackRelease -Tag <tag> [-DeleteRemote] [-RevertMerge] [-Push] [-MainBranch main]

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$Tag,
    [Parameter()] [switch]$DeleteRemote,
    [Parameter()] [switch]$RevertMerge,
    [Parameter()] [switch]$Push,
    [Parameter()] [string]$MainBranch = 'main'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = '.'

function Write-Info($msg) { Write-Host "[RollbackRelease] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[RollbackRelease] ERROR: $msg" -ForegroundColor Red }

function Ensure-GitIdentity {
    $cfgName = (git config user.name 2>$null).Trim()
    $cfgEmail = (git config user.email 2>$null).Trim()
    if (-not $cfgName -or -not $cfgEmail) {
        Write-Info "Configuring Git identity for this repository..."
        $name = if ($cfgName) { $cfgName } else { $env:GIT_USER_NAME }
        $email = if ($cfgEmail) { $cfgEmail } else { $env:GIT_USER_EMAIL }
        if (-not $name)  { $name  = Read-Host "Enter Git user.name" }
        if (-not $email) { $email = Read-Host "Enter Git user.email" }
        if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) { throw "Git identity is required (user.name and user.email)." }
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
    if (-not $originUrl) { Write-Info "Remote 'origin' is not set; remote deletion/push will be skipped unless configured." }

    Write-Info "Fetching latest refs ..."
    git fetch --tags origin 2>$null | Out-Null

    # Verify tag exists
    git show-ref --tags --verify --quiet "refs/tags/$Tag"
    if ($LASTEXITCODE -ne 0) { throw "Tag '$Tag' does not exist locally." }

    # Capture the tagged commit SHA
    $tagCommit = (git rev-list -n 1 $Tag).Trim()
    if (-not $tagCommit) { throw "Unable to resolve commit for tag '$Tag'" }
    Write-Info "Tag $Tag points to commit $tagCommit"

    # Delete local tag
    Write-Info "Deleting local tag $Tag"
    git tag -d $Tag
    if ($LASTEXITCODE -ne 0) { throw "Failed to delete local tag $Tag" }

    # Optionally delete remote tag
    if ($DeleteRemote -and $originUrl) {
        Write-Info "Deleting remote tag $Tag from origin"
        git push origin :refs/tags/$Tag
        if ($LASTEXITCODE -ne 0) { throw "Failed to delete remote tag $Tag" }
    }

    # Optionally revert merge/commit on main
    if ($RevertMerge) {
        # Ensure main is up-to-date
        Write-Info "Preparing to revert on $MainBranch"
        git checkout $MainBranch
        if ($LASTEXITCODE -ne 0) { throw "Failed to checkout $MainBranch" }
        git pull --ff-only origin $MainBranch 2>$null | Out-Null

        # Detect if commit is a merge commit (has 2+ parents)
        $parentCount = (git rev-list --parents -n 1 $tagCommit).Split(' ').Length - 1
        if ($parentCount -ge 2) {
            Write-Info "Reverting merge commit $tagCommit on $MainBranch (mainline parent 1)"
            git revert -m 1 $tagCommit
        } else {
            Write-Info "Reverting non-merge commit $tagCommit on $MainBranch"
            git revert $tagCommit
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Revert failed. Resolve conflicts, run 'git revert --continue' or '--abort', then retry."
            exit $LASTEXITCODE
        }

        if ($Push -and $originUrl) {
            Write-Info "Pushing $MainBranch to origin"
            git push origin $MainBranch
            if ($LASTEXITCODE -ne 0) { Write-Err "Push failed."; exit $LASTEXITCODE }
        }
    }

    Write-Info "Rollback complete ✅"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
