# Script de Desenvolvimento Android - Lista de Compras IA
# Execute este arquivo para desenvolvimento com live reload

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Desenvolvimento Android - Live Reload  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ir para o diretório do projeto
Write-Host "[1/6] Navegando para o diretório do projeto..." -ForegroundColor Yellow
Set-Location -Path "E:\app-list-compras"
Write-Host "      ✓ Diretório: $PWD" -ForegroundColor Green
Write-Host ""

# 2. Matar processos Node antigos
Write-Host "[2/6] Limpando processos Node antigos..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "      ✓ Processos limpos" -ForegroundColor Green
Write-Host ""

# 3. Build do projeto web
Write-Host "[3/6] Fazendo build do projeto web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Build concluído" -ForegroundColor Green
} else {
    Write-Host "      ✗ Erro no build!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Sincronizar com Android
Write-Host "[4/6] Sincronizando com Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Sincronização concluída" -ForegroundColor Green
} else {
    Write-Host "      ✗ Erro na sincronização!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Iniciar servidor de desenvolvimento
Write-Host "[5/6] Iniciando servidor de desenvolvimento..." -ForegroundColor Yellow
Write-Host "      Aguarde... O servidor será iniciado em background" -ForegroundColor Cyan

# Iniciar servidor em background
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

# Aguardar servidor iniciar
Start-Sleep -Seconds 3
Write-Host "      ✓ Servidor iniciado em http://localhost:3004" -ForegroundColor Green
Write-Host ""

# 6. Abrir Android Studio
Write-Host "[6/6] Abrindo Android Studio..." -ForegroundColor Yellow
npx cap open android
Write-Host "      ✓ Android Studio será aberto" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  DESENVOLVIMENTO PRONTO!  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 No Android Studio:" -ForegroundColor Cyan
Write-Host "   1. Aguarde o Gradle Sync terminar" -ForegroundColor White
Write-Host "   2. Execute o app no emulador/dispositivo" -ForegroundColor White
Write-Host "   3. O app se conectará automaticamente ao servidor" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Servidor rodando em:" -ForegroundColor Cyan
Write-Host "   http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Para atualizar o app:" -ForegroundColor Cyan
Write-Host "   1. Faça suas alterações no código" -ForegroundColor White
Write-Host "   2. Execute: npm run build" -ForegroundColor White
Write-Host "   3. Execute: npx cap sync android" -ForegroundColor White
Write-Host "   4. Recompile no Android Studio" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Mantenha este PowerShell aberto!" -ForegroundColor Yellow
Write-Host "   Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""
