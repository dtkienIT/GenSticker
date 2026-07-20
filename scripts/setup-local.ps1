# Windows PowerShell Setup Local Script
Write-Host "Setting up GenSticker Local Environment..." -ForegroundColor Green

# 1. Create Python venv if missing
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
}

# 2. Install backend dev dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e "backend[dev]"

# 3. Create .env if missing
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 4. Create data directories
Write-Host "Creating local data directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "data/assets" | Out-Null
New-Item -ItemType Directory -Force -Path "data/artifacts" | Out-Null

# 5. Run Alembic migrations
Write-Host "Running Alembic database migrations..." -ForegroundColor Yellow
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head

Write-Host "Setup completed successfully!" -ForegroundColor Green
