# Create or open a GitHub Pull Request for the current branch
# Requires: git; optional: GitHub CLI (gh). If gh is unavailable, falls back to opening the PR URL in browser.
# Usage examples:
#   .\CreatePullRequest.ps1                          # PR from current branch -> main, prompt for title/body
#   .\CreatePullRequest.ps1 -Base main -Title "Add JD" -Body "Improvements" -Open
#   .\CreatePullRequest.ps1 -Draft -Reviewers "alice,bob" -Labels "feature,backend"

[CmdletBinding()]
param(
  [Parameter()] [string]$Base = "main",
  [Parameter()] [string]$Head = "",
  [Parameter()] [string]$Title = "",
  [Parameter()] [string]$Body = "",
  [Parameter()] [switch]$Draft,
  [Parameter()] [switch]$Open,
  [Parameter()] [string]$Reviewers = "",
  [Parameter()] [string]$Assignees = "",
  [Parameter()] [string]$Labels = "",
  [Parameter()] [string]$Milestone = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[CreatePullRequest] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[CreatePullRequest] ERROR: $msg" -ForegroundColor Red }

# Ensure we are in a git repo
git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Write-Err "Not a git repository"; exit 1 }

# Determine head branch if not supplied
if (-not $Head) {
  $Head = (git rev-parse --abbrev-ref HEAD).Trim()
}
if (-not $Head -or $Head -eq $Base) { Write-Err "Head branch must not be empty or equal to base ($Base)."; exit 1 }

# Ensure remote origin exists
$originUrl = (git remote get-url origin 2>$null)
if (-not $originUrl) { Write-Err "Remote 'origin' not set."; exit 1 }
Write-Info "Origin: $originUrl"
Write-Info "Base: $Base  Head: $Head"

# Push branch to origin to ensure PR can be created
Write-Info "Pushing '$Head' to origin..."
git push -u origin "$Head"
if ($LASTEXITCODE -ne 0) { Write-Err "Failed to push branch '$Head'"; exit 1 }

# Default PR title/body if empty
if (-not $Title) { $Title = "$Head" }
if (-not $Body) {
  # Compose a short body from recent commits
  $recent = git log --oneline -n 10 "$Base..$Head" 2>$null
  if ($recent) { $Body = "Auto-generated summary:\n\n$recent" } else { $Body = "" }
}

# Try GitHub CLI first
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  Write-Info "Using GitHub CLI to create PR..."
  $args = @('pr','create','--base', $Base, '--head', $Head, '--title', $Title)
  if ($Body) { $args += @('--body', $Body) }
  if ($Draft) { $args += '--draft' }
  if ($Reviewers) { $args += @('--reviewer', $Reviewers) }
  if ($Assignees) { $args += @('--assignee', $Assignees) }
  if ($Labels) { $args += @('--label', $Labels) }
  if ($Milestone) { $args += @('--milestone', $Milestone) }
  if ($Open) { $args += '--web' }

  gh @args
  if ($LASTEXITCODE -ne 0) { Write-Err "gh pr create failed"; exit $LASTEXITCODE }
  Write-Info "Pull request created via GitHub CLI."
  exit 0
}

# Fallback: construct compare URL and open in browser
Write-Info "GitHub CLI not found. Falling back to browser-based PR creation."
# Normalize origin to https URL and extract owner/repo
function Get-RepoPathFromOrigin($url) {
  if ($url -match 'git@github.com:(.*)') { return $Matches[1].TrimEnd('.git') }
  if ($url -match 'https?://github.com/(.*)') { return $Matches[1].TrimEnd('.git') }
  return $null
}
$repoPath = Get-RepoPathFromOrigin $originUrl
if (-not $repoPath) { Write-Err "Could not parse GitHub repository from origin URL."; exit 1 }
$compareUrl = "https://github.com/$repoPath/compare/${Base}...${Head}?expand=1"
Write-Info "Open this URL to create the PR:"
Write-Host $compareUrl
if ($Open) {
  Write-Info "Opening browser..."
  Start-Process $compareUrl | Out-Null
}
