# Script Completo para Gerar APK Android - Lista de Compras IA
# Execute: .\build-apk-completo.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  BUILD APK COMPLETO COM APRESENTACAO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Build do projeto web
Write-Host "Passo 1/6: Build do projeto web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no build!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Build concluído (React compilado: $(if (Test-Path dist\assets\*.js) { 'SIM' } else { 'NAO' }))" -ForegroundColor Green
Write-Host ""

# Passo 2: Copiar arquivos de apresentação para dist
Write-Host "Passo 2/6: Copiando arquivos de apresentação..." -ForegroundColor Yellow
copy apresentacao.html dist\apresentacao.html
copy apresentacao.css dist\apresentacao.css
copy apresentacao.js dist\apresentacao.js
Write-Host "OK: Arquivos copiados" -ForegroundColor Green
Write-Host ""

# Passo 3: Sync com Android
Write-Host "Passo 3/6: Sincronizando com Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha na sincronização!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Sincronização concluída" -ForegroundColor Green
Write-Host ""

# Passo 4: Corrigir configurações Java (VERSION_21 -> VERSION_17)
Write-Host "Passo 4/6: Corrigindo configurações Java..." -ForegroundColor Yellow

# Corrigir android/app/capacitor.build.gradle
(Get-Content android\app\capacitor.build.gradle) -replace 'JavaVersion.VERSION_21', 'JavaVersion.VERSION_17' | Set-Content android\app\capacitor.build.gradle

# Corrigir android/capacitor-cordova-android-plugins/build.gradle
(Get-Content android\capacitor-cordova-android-plugins\build.gradle) -replace 'JavaVersion.VERSION_21', 'JavaVersion.VERSION_17' | Set-Content android\capacitor-cordova-android-plugins\build.gradle

Write-Host "OK: Configurações corrigidas" -ForegroundColor Green
Write-Host ""

# Passo 5: Gerar APK
Write-Host "Passo 5/6: Gerando APK (pode demorar)..." -ForegroundColor Yellow
cd android
.\gradlew assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao gerar APK!" -ForegroundColor Red
    cd ..
    exit 1
}
cd ..
Write-Host "OK: APK gerado com sucesso!" -ForegroundColor Green
Write-Host ""

# Passo 6: Verificar resultado
Write-Host "Passo 6/6: Verificando APK gerado..." -ForegroundColor Yellow
$apk = Get-Item android\app\build\outputs\apk\debug\app-debug.apk
$tamanhoMB = [math]::Round($apk.Length / 1MB, 2)

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  APK GERADO COM SUCESSO!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Localização:" -ForegroundColor White
Write-Host "android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tamanho: $tamanhoMB MB" -ForegroundColor White
Write-Host "Data: $($apk.LastWriteTime)" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  PROXIMO PASSO:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instalar no celular via USB:" -ForegroundColor White
Write-Host "adb install -r android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ou compartilhe o arquivo APK via WhatsApp/Email/Drive" -ForegroundColor White
Write-Host ""
