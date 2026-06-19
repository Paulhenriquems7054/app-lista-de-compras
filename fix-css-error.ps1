# Script para corrigir erro do PostCSS/Tailwind CSS
# Lista de Compras IA

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔧 CORRIGINDO ERRO POSTCSS/TAILWIND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Parar processos Node
Write-Host "[1/6] Parando processos Node..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ Processos parados" -ForegroundColor Green
Write-Host ""

# 2. Limpar cache do Vite
Write-Host "[2/6] Limpando cache do Vite..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Write-Host "   ✓ Cache limpo" -ForegroundColor Green
Write-Host ""

# 3. Limpar node_modules
Write-Host "[3/6] Limpando node_modules..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
Write-Host "   ✓ node_modules removido" -ForegroundColor Green
Write-Host ""

# 4. Limpar package-lock.json
Write-Host "[4/6] Limpando package-lock.json..." -ForegroundColor Yellow
Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
Write-Host "   ✓ package-lock.json removido" -ForegroundColor Green
Write-Host ""

# 5. Reinstalar dependências
Write-Host "[5/6] Reinstalando dependências..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro na instalação!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Dependências reinstaladas" -ForegroundColor Green
Write-Host ""

# 6. Iniciar servidor
Write-Host "[6/6] Iniciando servidor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Correção aplicada!" -ForegroundColor Green
Write-Host "  Servidor rodando em:" -ForegroundColor Green
Write-Host "  http://localhost:3004" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

npm run dev

