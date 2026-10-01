Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DRIVER MANAGEMENT SYSTEM (DMS)" -ForegroundColor Green
Write-Host "  Initializing Database and Starting Web Application..." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

python seed.py
python app.py
