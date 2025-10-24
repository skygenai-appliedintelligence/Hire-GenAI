# Run billing system migration
$env:PGPASSWORD = "Shubham@123"

Write-Host "Running billing system migration..." -ForegroundColor Green

& "C:\Program Files\PostgreSQL\16\bin\psql.exe" `
  -h aws-0-ap-south-1.pooler.supabase.com `
  -p 6543 `
  -U postgres.bnlqcmzqgxwvpfwqsqnb `
  -d postgres `
  -f "migrations\billing_system.sql"

if ($LASTEXITCODE -eq 0) {
  Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
  Write-Host "Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

Remove-Item Env:\PGPASSWORD
