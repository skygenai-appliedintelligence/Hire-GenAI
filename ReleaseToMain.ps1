# Requires: Git installed and available on PATH
# Merge a feature branch into main and create a release tag
# Usage examples:
#   .\ReleaseToMain.ps1 "Signup"                      # merge, tag with timestamp, push main+tags
#   .\ReleaseToMain.ps1 "Signup" -UsePackageVersion   # tag as v<package.json version>
#   .\ReleaseToMain.ps1 "Signup" -Tag v1.2.3          # use explicit tag name
#   .\ReleaseToMain.ps1 "Signup" -NoFF -Push          # no-fast-forward merge, push main and tags
# Wrapper: ReleaseToMain "Signup" [-NoFF] [-Push] [-Tag vX.Y.Z] [-UsePackageVersion]

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BranchName,

    [Parameter()] [switch]$NoFF,
    [Parameter()] [switch]$Push,
    [Parameter()] [string]$Tag,
    [Parameter()] [switch]$UsePackageVersion
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectDir = "."
$MainBranch = "main"

function Write-Info($msg) { Write-Host "[ReleaseToMain] $msg" -ForegroundColor Cyan }
function Write-Err($msg)  { Write-Host "[ReleaseToMain] ERROR: $msg" -ForegroundColor Red }

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

function Get-PackageVersion {
    $pkgPath = Join-Path -Path $ProjectDir -ChildPath 'package.json'
    if (-not (Test-Path $pkgPath)) { return $null }
    try {
        $json = Get-Content $pkgPath -Raw | ConvertFrom-Json
        return $json.version
    } catch { return $null }
}

function New-ReleaseTagName {
    param([string]$ExplicitTag, [switch]$FromPkg)
    if ($ExplicitTag) { return $ExplicitTag }
    if ($FromPkg) {
        $v = Get-PackageVersion
        if ($v) { return "v$($v)" }
        Write-Info "package.json version not found; falling back to timestamp tag"
    }
    # timestamp-based tag: vYYYYMMDD-HHMMSS
    $ts = (Get-Date).ToString('yyyyMMdd-HHmmss')
    return "v$ts"
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

    # Ensure main exists locally (use exit code, not output)
    git show-ref --verify --quiet "refs/heads/$MainBranch" *> $null
    $mainExists = ($LASTEXITCODE -eq 0)
    if (-not $mainExists) {
        Write-Info "Creating local $MainBranch tracking origin/$MainBranch"
        git checkout -b $MainBranch --track "origin/$MainBranch"
        if ($LASTEXITCODE -ne 0) { throw "Failed to create local $MainBranch" }
    }

    # Checkout and update main
    Write-Info "Checking out $MainBranch"
    git checkout $MainBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to checkout $MainBranch" }

    Write-Info "Pulling latest for $MainBranch"
    git pull --ff-only origin $MainBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to pull $MainBranch (resolve local changes)" }

    # Ensure source branch exists locally, otherwise track remote (use exit code)
    git show-ref --verify --quiet "refs/heads/$BranchName" *> $null
    $srcExists = ($LASTEXITCODE -eq 0)
    if (-not $srcExists) {
        Write-Info "Creating local branch $BranchName tracking origin/$BranchName"
        git checkout -b $BranchName --track "origin/$BranchName"
        if ($LASTEXITCODE -ne 0) { throw "Source branch $BranchName not found locally or on origin" }
    }

    # Merge feature into main
    git checkout $MainBranch | Out-Null
    $mergeArgs = @('merge', $BranchName)
    if ($NoFF) { $mergeArgs += '--no-ff' }
    Write-Info "Merging $BranchName into $MainBranch ..."
    git @mergeArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Merge failed. Resolve conflicts, commit, and re-run."
        exit $LASTEXITCODE
    }

    # Determine tag name
    $tagName = New-ReleaseTagName -ExplicitTag $Tag -FromPkg:$UsePackageVersion

    # Check if tag already exists
    git show-ref --tags --verify --quiet "refs/tags/$tagName"
    if ($LASTEXITCODE -eq 0) { throw "Tag '$tagName' already exists. Provide a different -Tag or enable -UsePackageVersion after bumping version." }

    # Create annotated tag
    Write-Info "Creating tag $tagName"
    git tag -a $tagName -m "Release $tagName from $BranchName"
    if ($LASTEXITCODE -ne 0) { throw "Failed to create tag $tagName" }

    if ($Push) {
        Write-Info "Pushing $MainBranch and tags to origin ..."
        git push origin $MainBranch
        if ($LASTEXITCODE -ne 0) { Write-Err "Push main failed."; exit $LASTEXITCODE }
        git push origin --tags
        if ($LASTEXITCODE -ne 0) { Write-Err "Push tags failed."; exit $LASTEXITCODE }
    }

    Write-Info "Release complete ✅ (merged $BranchName -> $MainBranch, tagged $tagName)"
}
catch {
    Write-Err $_.Exception.Message
    exit 1
}
