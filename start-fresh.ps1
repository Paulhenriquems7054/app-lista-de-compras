# Script para iniciar o servidor com cache limpo

Write-Host "🧹 Limpando cache..." -ForegroundColor Cyan

# Parar servidores na porta 3004
Get-NetTCPConnection -LocalPort 3004 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Limpar cache do Vite
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite-temp -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

Write-Host "✅ Cache limpo!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor
npm run dev


