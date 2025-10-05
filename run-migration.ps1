# Quick migration runner for PowerShell
Write-Host "Running evaluation migration..." -ForegroundColor Green

try {
    node scripts/run-evaluation-migration.js
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Migration failed: $_" -ForegroundColor Red
    exit 1
}
