# Script para Gerar APK Atualizado - Lista de Compras IA
# Execute este arquivo para gerar um novo APK com as últimas alterações

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gerando APK Atualizado  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ir para o diretório do projeto
Write-Host "[1/7] Navegando para o diretório do projeto..." -ForegroundColor Yellow
Set-Location -Path "E:\app-list-compras"
Write-Host "      ✓ Diretório: $PWD" -ForegroundColor Green
Write-Host ""

# 2. Matar processos Node antigos
Write-Host "[2/7] Limpando processos Node antigos..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "      ✓ Processos limpos" -ForegroundColor Green
Write-Host ""

# 3. Limpar cache e builds antigos
Write-Host "[3/7] Limpando cache e builds antigos..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.vite-temp" -ErrorAction SilentlyContinue
Write-Host "      ✓ Cache limpo" -ForegroundColor Green
Write-Host ""

# 4. Instalar dependências (se necessário)
Write-Host "[4/7] Verificando dependências..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "      Instalando dependências..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      ✗ Erro na instalação!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "      ✓ Dependências OK" -ForegroundColor Green
Write-Host ""

# 5. Build do projeto web
Write-Host "[5/7] Fazendo build do projeto web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Build web concluído" -ForegroundColor Green
} else {
    Write-Host "      ✗ Erro no build web!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 6. Sincronizar com Android
Write-Host "[6/7] Sincronizando com Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Sincronização concluída" -ForegroundColor Green
} else {
    Write-Host "      ✗ Erro na sincronização!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 7. Abrir Android Studio para build final
Write-Host "[7/7] Abrindo Android Studio..." -ForegroundColor Yellow
Write-Host "      Android Studio será aberto para gerar o APK final" -ForegroundColor Cyan
npx cap open android
Write-Host "      ✓ Android Studio aberto" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD CONCLUÍDO!  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 No Android Studio:" -ForegroundColor Cyan
Write-Host "   1. Aguarde o Gradle Sync terminar" -ForegroundColor White
Write-Host "   2. Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
Write-Host "   3. Aguarde o build terminar" -ForegroundColor White
Write-Host "   4. Clique em 'locate' para ver o APK" -ForegroundColor White
Write-Host ""
Write-Host "📦 APK será gerado em:" -ForegroundColor Cyan
Write-Host "   android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""
Write-Host "✅ Correções aplicadas:" -ForegroundColor Green
Write-Host "   • Configuração do Capacitor corrigida" -ForegroundColor White
Write-Host "   • URL do servidor ajustada para http://localhost:3004" -ForegroundColor White
Write-Host "   • Esquema Android alterado para HTTP" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Para desenvolvimento com live reload:" -ForegroundColor Cyan
Write-Host "   Execute: .\dev-android.ps1" -ForegroundColor White
Write-Host ""
