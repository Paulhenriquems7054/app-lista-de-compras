# Script para corrigir versões do Java automaticamente
# Execute este script antes de cada build

Write-Host "Corrigindo versões do Java..." -ForegroundColor Yellow

# Corrigir capacitor.build.gradle
$capacitorBuildGradle = "android\app\capacitor.build.gradle"
if (Test-Path $capacitorBuildGradle) {
    $content = Get-Content $capacitorBuildGradle -Raw
    $content = $content -replace "JavaVersion\.VERSION_21", "JavaVersion.VERSION_17"
    Set-Content $capacitorBuildGradle $content -NoNewline
    Write-Host "✓ Capacitor build.gradle corrigido" -ForegroundColor Green
}

# Corrigir capacitor-cordova-android-plugins build.gradle
$cordovaBuildGradle = "android\capacitor-cordova-android-plugins\build.gradle"
if (Test-Path $cordovaBuildGradle) {
    $content = Get-Content $cordovaBuildGradle -Raw
    $content = $content -replace "JavaVersion\.VERSION_21", "JavaVersion.VERSION_17"
    Set-Content $cordovaBuildGradle $content -NoNewline
    Write-Host "✓ Cordova build.gradle corrigido" -ForegroundColor Green
}

Write-Host "Correções aplicadas com sucesso!" -ForegroundColor Green



