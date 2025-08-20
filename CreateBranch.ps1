# Requires: Git installed and available on PATH
# Usage: .\CreateBranch.ps1 "feature/my-branch"  OR via CreateBranch.cmd: CreateBranch "feature/my-branch"

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BranchName
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Update this path if your project root changes
$ProjectDir = "."

function Write-Info($msg) { Write-Host "[CreateBranch] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[CreateBranch] ERROR: $msg" -ForegroundColor Red }

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

    $Branch = $BranchName.Trim()
    if ([string]::IsNullOrWhiteSpace($Branch)) {
        Write-Err "Branch name cannot be empty"
        exit 1
    }

    # Optional: basic sanitation (replace spaces with dashes)
    if ($Branch -match "\s") { $Branch = ($Branch -replace "\s+","-") }

    Write-Info "Preparing branch: $Branch"

    # If local branch exists, just checkout; otherwise create new from current HEAD
    git show-ref --verify --quiet "refs/heads/$Branch"
    if ($LASTEXITCODE -eq 0) {
        Write-Info "Local branch exists. Checking out..."
        git checkout "$Branch"
    }
    else {
        # If remote branch exists, track it; else create new
        git ls-remote --exit-code --heads origin "$Branch" *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Remote branch exists on origin. Creating local tracking branch..."
            git checkout -b "$Branch" --track "origin/$Branch"
        }
        else {
            Write-Info "Creating new branch from current HEAD..."
            git checkout -b "$Branch"
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Git operation failed. See messages above."
        exit $LASTEXITCODE
    }

    Write-Info "Now on branch: $(git rev-parse --abbrev-ref HEAD)"
    Write-Info "Location: $(Get-Location)"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
