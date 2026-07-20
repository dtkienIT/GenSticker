# Windows PowerShell Start Local Script
Write-Host "Starting GenSticker Local API & Durable Job Worker..." -ForegroundColor Green

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    Write-Host "Starting Docker Compose services (api & worker)..." -ForegroundColor Yellow
    docker compose up --build api worker
} else {
    Write-Host "Docker Compose not detected. Launching local Python processes..." -ForegroundColor Yellow
    $env:PYTHONPATH="."
    Start-Process -FilePath ".\.venv\Scripts\python.exe" -ArgumentList "-m backend.app.main" -NoNewWindow
    Start-Process -FilePath ".\.venv\Scripts\python.exe" -ArgumentList "-m backend.app.jobs.worker" -NoNewWindow
}
