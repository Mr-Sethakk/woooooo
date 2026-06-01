Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Feynman Platform - Stopping Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Kill processes on port 3000 (Backend)
Write-Host "Stopping Backend (port 3000)..." -ForegroundColor Yellow
$proc3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($proc3000) {
    $proc3000 | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "  Backend stopped." -ForegroundColor Green
} else {
    Write-Host "  Backend was not running." -ForegroundColor DarkGray
}

# Kill processes on port 5173 (Frontend)
Write-Host "Stopping Frontend (port 5173)..." -ForegroundColor Yellow
$proc5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($proc5173) {
    $proc5173 | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "  Frontend stopped." -ForegroundColor Green
} else {
    Write-Host "  Frontend was not running." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Done! All services stopped." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
