# Windows PowerShell Reset Local Script
param (
    [switch]$Yes
)

if (-not $Yes) {
    $confirmation = Read-Host "Are you sure you want to reset all local SQLite data and asset files? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Reset cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Resetting GenSticker local data..." -ForegroundColor Red

# Stop containers if running
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose down
}

# Remove local database
if (Test-Path "data/gensticker.db") {
    Remove-Item "data/gensticker.db" -Force
}

# Remove local asset storage
if (Test-Path "data/assets") {
    Remove-Item "data/assets\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Re-run migrations
$env:PYTHONPATH="."
if (Test-Path ".\.venv\Scripts\python.exe") {
    .\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
}

Write-Host "Local reset completed!" -ForegroundColor Green
