# Run the OpenAI project ID migrations
Write-Host "🚀 Running OpenAI Project ID migrations..." -ForegroundColor Cyan

# Run the column addition migration
Write-Host "Adding openai_project_id column..." -ForegroundColor Yellow
psql $env:DATABASE_URL -f "./migrations/20251028_add_openai_project_id.sql"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Column addition migration failed" -ForegroundColor Red
    exit 1
}

# Run the function creation migration
Write-Host "Creating update function..." -ForegroundColor Yellow
psql $env:DATABASE_URL -f "./migrations/20251028_add_openai_update_function.sql"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Function creation migration failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ OpenAI Project ID migrations completed successfully" -ForegroundColor Green
