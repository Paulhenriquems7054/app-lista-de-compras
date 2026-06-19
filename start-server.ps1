# Script de Inicialização do Servidor - Lista de Compras IA
# Execute este arquivo clicando com botão direito e "Executar com PowerShell"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Lista de Compras IA - Iniciando...  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ir para o diretório do projeto
Write-Host "[1/5] Navegando para o diretório do projeto..." -ForegroundColor Yellow
Set-Location -Path "E:\app-list-compras"
Write-Host "      ✓ Diretório: $PWD" -ForegroundColor Green
Write-Host ""

# 2. Matar processos Node antigos
Write-Host "[2/5] Limpando processos Node antigos..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "      ✓ Processos limpos" -ForegroundColor Green
Write-Host ""

# 3. Limpar cache do Vite
Write-Host "[3/5] Limpando cache do Vite..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.vite-temp" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Write-Host "      ✓ Cache limpo" -ForegroundColor Green
Write-Host ""

# 4. Verificar se Vite está instalado
Write-Host "[4/5] Verificando instalação do Vite..." -ForegroundColor Yellow
$viteVersion = npx vite --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Vite instalado: $viteVersion" -ForegroundColor Green
} else {
    Write-Host "      ✗ Vite não encontrado! Instalando..." -ForegroundColor Red
    npm install
}
Write-Host ""

# 5. Iniciar o servidor
Write-Host "[5/5] Iniciando o servidor..." -ForegroundColor Yellow
Write-Host "      Aguarde... O navegador abrirá automaticamente" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Servidor iniciando em:" -ForegroundColor Green
Write-Host "  http://localhost:3004" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar o servidor
npm run dev

# Se falhar, tentar com npx
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Tentando método alternativo..." -ForegroundColor Yellow
    npx vite --port 3004 --host localhost
}

