# Requires: Git installed and available on PATH
# Usage:
#   .\CheckInToGithub.ps1 "Commit message"
#   .\CheckInToGithub.ps1 "Commit message" -NoVerify -Force
# Or via wrapper:
#   CheckInToGithub "Commit message"

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message,

    [Parameter()] [switch]$NoVerify,
    [Parameter()] [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# If you move the repo, update this path. Using '.' assumes you run this from repo root.
$ProjectDir = "."

function Write-Info($msg) { Write-Host "[CheckInToGithub] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[CheckInToGithub] ERROR: $msg" -ForegroundColor Red }

# Ensure per-repo Git identity is configured
function Ensure-GitIdentity {
    # Read existing config
    $cfgName = (git config user.name 2>$null).Trim()
    $cfgEmail = (git config user.email 2>$null).Trim()

    if (-not $cfgName -or -not $cfgEmail) {
        Write-Info "Configuring Git identity for this repository..."

        # Try environment variables first
        $name = if ($cfgName) { $cfgName } else { $env:GIT_USER_NAME }
        $email = if ($cfgEmail) { $cfgEmail } else { $env:GIT_USER_EMAIL }

        # Prompt if still missing
        if (-not $name)  { $name  = Read-Host "Enter Git user.name" }
        if (-not $email) { $email = Read-Host "Enter Git user.email" }

        if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
            throw "Git identity is required (user.name and user.email)."
        }

        git config user.name "$name"
        if ($LASTEXITCODE -ne 0) { throw "Failed to set git user.name" }
        git config user.email "$email"
        if ($LASTEXITCODE -ne 0) { throw "Failed to set git user.email" }

        Write-Info "Git identity set locally: $name <$email>"
    } else {
        Write-Info "Git identity detected: $cfgName <$cfgEmail>"
    }
}

try {
    if (-not (Test-Path -Path $ProjectDir -PathType Container)) {
        Write-Err "Project directory not found: $ProjectDir"
        exit 1
    }

    Write-Info "Switching to project directory: $ProjectDir"
    Set-Location -Path $ProjectDir

    # Validate Git repo
    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Not a Git repository: $ProjectDir"
        exit 1
    }

    # Ensure git identity exists (repo-local)
    Ensure-GitIdentity

    # Determine current branch
    $CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ([string]::IsNullOrWhiteSpace($CurrentBranch) -or $CurrentBranch -eq 'HEAD') {
        Write-Err "Could not determine current branch. Are you in a detached HEAD state?"
        exit 1
    }
    Write-Info "Current branch: $CurrentBranch"

    # Check for remote 'origin'
    $originUrl = (git remote get-url origin 2>$null)
    if (-not $originUrl) {
        Write-Err "Remote 'origin' is not set. Run: git remote add origin <url>"
        exit 1
    }
    Write-Info "Origin: $originUrl"

    # Add and commit if there are changes
    $status = git status --porcelain
    if ($status) {
        Write-Info "Staging changes..."
        git add -A
        if ($LASTEXITCODE -ne 0) { throw "git add failed" }

        Write-Info "Committing changes..."
        $commitArgs = @('commit','-m', $Message)
        if ($NoVerify) { $commitArgs += '--no-verify' }
        git @commitArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Commit failed. Fix issues and retry."
            exit $LASTEXITCODE
        }
    } else {
        Write-Info "No local changes to commit. Proceeding to push."
    }

    # Push to origin
    $pushArgs = @('push','-u','origin', $CurrentBranch)
    if ($Force) { $pushArgs += '--force-with-lease' }
    Write-Info "Pushing to origin/$CurrentBranch ..."
    git @pushArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Push failed. Resolve errors above and retry."
        exit $LASTEXITCODE
    }

    Write-Info "Push successful ✅"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
