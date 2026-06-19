# Script Completo para Rebuild do APK
# Lista de Compras IA v1.0.9

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔄 REBUILD COMPLETO DO APK" -ForegroundColor Cyan
Write-Host "  Versão 1.0.9" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# 1. Parar processos Node
Write-Host "[1/8] Parando processos Node..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ Processos parados" -ForegroundColor Green
Write-Host ""

# 2. Limpar dist antigo
Write-Host "[2/8] Limpando build antigo..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Write-Host "   ✓ Dist removido" -ForegroundColor Green
Write-Host ""

# 3. Limpar cache do Vite
Write-Host "[3/8] Limpando cache do Vite..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Write-Host "   ✓ Cache limpo" -ForegroundColor Green
Write-Host ""

# 4. Fazer novo build
Write-Host "[4/8] Fazendo novo build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro no build!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Build concluído" -ForegroundColor Green
Write-Host ""

# 5. Verificar dist/index.html
Write-Host "[5/8] Verificando arquivos..." -ForegroundColor Yellow
if (Test-Path "dist/index.html") {
    Write-Host "   ✓ dist/index.html existe" -ForegroundColor Green
    
    # Verificar versão
    $distContent = Get-Content "dist/index.html" -Raw
    if ($distContent -match "1\.0\.9") {
        Write-Host "   ✓ Versão 1.0.9 encontrada no build" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Versão pode estar incorreta" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ dist/index.html não encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 6. Sync com Capacitor
Write-Host "[6/8] Sincronizando com Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro no sync!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Sync concluído" -ForegroundColor Green
Write-Host ""

# 7. Copy assets
Write-Host "[7/8] Copiando assets..." -ForegroundColor Yellow
npx cap copy android
Write-Host "   ✓ Assets copiados" -ForegroundColor Green
Write-Host ""

# 8. Abrir Android Studio
Write-Host "[8/8] Abrindo Android Studio..." -ForegroundColor Yellow
npx cap open android
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ REBUILD CONCLUÍDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos no Android Studio:" -ForegroundColor Cyan
Write-Host "   1. Aguarde o Gradle sync completar" -ForegroundColor White
Write-Host "   2. Limpe o projeto: Build > Clean Project" -ForegroundColor White
Write-Host "   3. Rebuild: Build > Rebuild Project" -ForegroundColor White
Write-Host "   4. Gere o APK: Build > Build Bundle(s) / APK(s) > Build APK(s)" -ForegroundColor White
Write-Host ""
Write-Host "📍 Localização do APK:" -ForegroundColor Cyan
Write-Host "   android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor White
Write-Host ""
Write-Host "🎯 IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   O novo APK terá a versão 1.0.9 com:" -ForegroundColor Yellow
Write-Host "   ✓ Tela de apresentação" -ForegroundColor White
Write-Host "   ✓ Menu lateral com MENU button" -ForegroundColor White
Write-Host "   ✓ Botões de ferramentas no menu lateral" -ForegroundColor White
Write-Host "   ✓ Todas as funcionalidades atualizadas" -ForegroundColor White
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
pause

