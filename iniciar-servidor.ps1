# Script para iniciar o servidor Vite
# Use este script sempre que precisar iniciar o app

Write-Host "🚀 Iniciando Lista de Compras IA..." -ForegroundColor Cyan
Write-Host ""

# Limpar cache temporário
Write-Host "🧹 Limpando cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.vite-temp -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

Write-Host "✅ Cache limpo!" -ForegroundColor Green
Write-Host ""

# Iniciar servidor
Write-Host "🌐 Iniciando servidor na porta 3004..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Acesse em: http://localhost:3004/" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Se o menu não aparecer, limpe o cache do navegador:" -ForegroundColor Yellow
Write-Host "   Ctrl + Shift + Delete → Limpar cache → Ctrl + F5" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Iniciar Vite
npx vite --port 3004 --open


