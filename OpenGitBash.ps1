# Opens Git Bash in the repository directory
# Usage:
#   .\OpenGitBash.ps1
#   # or via wrapper: .\OpenGitBash.cmd

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoDir = (Resolve-Path '.').Path

function Write-Info($msg) { Write-Host "[OpenGitBash] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[OpenGitBash] ERROR: $msg" -ForegroundColor Red }

function Find-GitBash {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Git\git-bash.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\git-bash.exe'),
        (Join-Path $env:LocalAppData 'Programs\Git\git-bash.exe')
    ) | Where-Object { Test-Path $_ }

    if ($candidates) { return ($candidates | Select-Object -First 1) }

    # Fallback: derive from where git.exe
    $gitExe = (where.exe git 2>$null | Select-Object -First 1)
    if ($gitExe) {
        # git.exe is typically at <GitRoot>\cmd\git.exe; bash is at <GitRoot>\git-bash.exe
        $gitRoot = Split-Path (Split-Path $gitExe) -Parent
        $derived = Join-Path $gitRoot 'git-bash.exe'
        if (Test-Path $derived) { return $derived }
    }

    return $null
}

try {
    # Ensure inside a git repository (optional but helpful)
    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) { Write-Err "Not a Git repository: $RepoDir"; exit 1 }

    $gitBash = Find-GitBash
    if (-not $gitBash) {
        Write-Err "Could not find git-bash.exe. Please install Git for Windows from https://git-scm.com/download/win"
        exit 2
    }

    Write-Info "Launching Git Bash at: $RepoDir"
    # --cd sets the starting directory
    Start-Process -FilePath $gitBash -ArgumentList @("--cd=$RepoDir") -WorkingDirectory $RepoDir | Out-Null
    exit 0
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
