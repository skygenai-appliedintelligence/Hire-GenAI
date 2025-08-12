Param(
  [string]$Remote,
  [string]$Branch = "main",
  [string]$Message,
  [switch]$Force
)

function Exec($cmd) {
  Write-Host "› $cmd" -ForegroundColor Cyan
  $ErrorActionPreference = 'Stop'
  iex $cmd
}

try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git is not installed or not in PATH. Install Git and retry."
  }

  if (-not (Test-Path .git)) {
    Exec 'git init'
  }

  # Ensure user identity exists (local fallback if missing)
  $name = (git config user.name 2>$null)
  $email = (git config user.email 2>$null)
  if (-not $name) { git config user.name "autobot" | Out-Null }
  if (-not $email) { git config user.email "autobot@example.com" | Out-Null }

  # Determine remote
  $existingRemote = (& git remote get-url origin 2>$null)
  if (-not $existingRemote) {
    if (-not $Remote) { $Remote = $env:GIT_REMOTE }
    if (-not $Remote) { throw "No remote set. Pass -Remote https://github.com/<owner>/<repo>.git or set GIT_REMOTE env var." }
    Exec "git remote add origin `"$Remote`""
  } else {
    if ($Remote -and $Remote -ne $existingRemote) { Exec "git remote set-url origin `"$Remote`"" }
  }

  # Decide branch
  $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($currentBranch -eq 'HEAD' -or [string]::IsNullOrWhiteSpace($currentBranch)) { $currentBranch = $Branch }
  if ($currentBranch -ne $Branch) { $Branch = $currentBranch }

  # Stage and commit
  Exec 'git add -A'
  if (-not $Message) { $Message = "chore: update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }
  # Commit if there are changes
  $status = git status --porcelain
  if ($status) {
    Exec "git commit -m `"$Message`""
  } else {
    Write-Host "No changes to commit." -ForegroundColor Yellow
  }

  # Ensure branch name exists
  Exec "git branch -M $Branch"

  # Push
  $pushFlags = ''
  if ($Force.IsPresent) { $pushFlags = '--force-with-lease' }
  if ($pushFlags -ne '') {
    Exec "git push -u origin $Branch $pushFlags"
  } else {
    Exec "git push -u origin $Branch"
  }

  Write-Host "✔ Pushed to origin/$Branch" -ForegroundColor Green
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

