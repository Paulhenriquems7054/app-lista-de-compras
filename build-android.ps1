# Script para Build Android - Lista de Compras IA
# Execute: .\build-android.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  LISTA DE COMPRAS IA - BUILD ANDROID" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Node.js não encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Node.js encontrado" -ForegroundColor Green
Write-Host ""

# Passo 1: Build do projeto web
Write-Host "Passo 1/3: Build do projeto web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no build do projeto web!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Build web concluído" -ForegroundColor Green
Write-Host ""

# Passo 2: Sync com Android
Write-Host "Passo 2/3: Sincronizando com Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha na sincronização com Android!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Sincronização concluída" -ForegroundColor Green
Write-Host ""

# Passo 3: Abrir Android Studio
Write-Host "Passo 3/3: Abrindo Android Studio..." -ForegroundColor Yellow
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASSOS NO ANDROID STUDIO:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Aguarde o Gradle Sync terminar" -ForegroundColor White
Write-Host "2. Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
Write-Host "3. Aguarde o build" -ForegroundColor White
Write-Host "4. Clique em 'locate' para ver o APK" -ForegroundColor White
Write-Host ""
Write-Host "APK estará em:" -ForegroundColor Yellow
Write-Host "android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""

npx cap open android

Write-Host ""
Write-Host "Android Studio aberto!" -ForegroundColor Green
Write-Host ""
