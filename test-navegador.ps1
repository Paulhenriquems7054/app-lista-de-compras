# Script de Teste - Navegador vs APK
# Lista de Compras IA v1.0.9

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🧪 TESTE: Navegador vs APK" -ForegroundColor Cyan
Write-Host "  Lista de Compras IA v1.0.9" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    Write-Host "   Diretório atual: $PWD" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Diretório correto: $PWD" -ForegroundColor Green
Write-Host ""

# Menu de opções
Write-Host "Escolha uma opção:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] 🧹 Limpar cache e reiniciar servidor" -ForegroundColor White
Write-Host "  [2] 🧪 Abrir página de teste (reset-cache.html)" -ForegroundColor White
Write-Host "  [3] 🚀 Reiniciar servidor apenas" -ForegroundColor White
Write-Host "  [4] 📱 Rebuild APK Android" -ForegroundColor White
Write-Host "  [5] 🔍 Ver status do LocalStorage" -ForegroundColor White
Write-Host "  [0] ❌ Sair" -ForegroundColor Gray
Write-Host ""

$opcao = Read-Host "Digite o número da opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "🧹 Limpando cache do Vite..." -ForegroundColor Yellow
        
        # Parar processos Node
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Processos Node parados" -ForegroundColor Green
        
        # Limpar cache
        Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
        Write-Host "   ✓ Cache limpo" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🚀 Iniciando servidor..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Servidor rodando em:" -ForegroundColor Green
        Write-Host "  http://localhost:3004" -ForegroundColor White
        Write-Host ""
        Write-Host "  📋 Página de teste:" -ForegroundColor Cyan
        Write-Host "  http://localhost:3004/reset-cache.html" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        
        npm run dev
    }
    
    "2" {
        Write-Host ""
        Write-Host "🧪 Abrindo página de teste..." -ForegroundColor Yellow
        
        # Verificar se servidor está rodando
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3004" -Method Head -TimeoutSec 2 -ErrorAction Stop
            Write-Host "   ✓ Servidor está rodando" -ForegroundColor Green
            
            # Abrir navegador
            Start-Process "http://localhost:3004/reset-cache.html"
            Write-Host "   ✓ Navegador aberto" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Instruções:" -ForegroundColor Cyan
            Write-Host "   1. Clique em 'Testar Fluxo Completo'" -ForegroundColor White
            Write-Host "   2. Você verá a apresentação" -ForegroundColor White
            Write-Host "   3. Depois verá o app completo com menu" -ForegroundColor White
        }
        catch {
            Write-Host "   ❌ Servidor NÃO está rodando!" -ForegroundColor Red
            Write-Host ""
            Write-Host "Execute primeiro a opção [1] ou [3]" -ForegroundColor Yellow
        }
        Write-Host ""
        pause
    }
    
    "3" {
        Write-Host ""
        Write-Host "🚀 Reiniciando servidor..." -ForegroundColor Yellow
        
        # Parar processos Node
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Processos anteriores parados" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Servidor rodando em:" -ForegroundColor Green
        Write-Host "  http://localhost:3004" -ForegroundColor White
        Write-Host ""
        Write-Host "  📋 Página de teste:" -ForegroundColor Cyan
        Write-Host "  http://localhost:3004/reset-cache.html" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        
        npm run dev
    }
    
    "4" {
        Write-Host ""
        Write-Host "📱 Rebuild APK Android..." -ForegroundColor Yellow
        Write-Host ""
        
        # Build
        Write-Host "[1/4] Build do projeto..." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ❌ Erro no build!" -ForegroundColor Red
            pause
            exit 1
        }
        Write-Host "   ✓ Build concluído" -ForegroundColor Green
        
        # Sync
        Write-Host ""
        Write-Host "[2/4] Sync com Capacitor..." -ForegroundColor Cyan
        npx cap sync android
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ❌ Erro no sync!" -ForegroundColor Red
            pause
            exit 1
        }
        Write-Host "   ✓ Sync concluído" -ForegroundColor Green
        
        # Copy
        Write-Host ""
        Write-Host "[3/4] Copiando assets..." -ForegroundColor Cyan
        npx cap copy android
        Write-Host "   ✓ Copy concluído" -ForegroundColor Green
        
        # Open
        Write-Host ""
        Write-Host "[4/4] Abrindo Android Studio..." -ForegroundColor Cyan
        npx cap open android
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅ Android Studio aberto!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Próximos passos no Android Studio:" -ForegroundColor Cyan
        Write-Host "   1. Aguarde o Gradle sync" -ForegroundColor White
        Write-Host "   2. Clique em Run (Shift+F10)" -ForegroundColor White
        Write-Host "   3. Ou Build > Build Bundle(s) / APK(s)" -ForegroundColor White
        Write-Host ""
        pause
    }
    
    "5" {
        Write-Host ""
        Write-Host "🔍 Verificando LocalStorage..." -ForegroundColor Yellow
        Write-Host ""
        
        # Criar HTML temporário para ler localStorage
        $tempHtml = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Status</title></head>
<body>
<pre id="output"></pre>
<script>
const output = document.getElementById('output');
const data = {
    hasSeenPresentation: localStorage.getItem('hasSeenPresentation'),
    appVersion: localStorage.getItem('appVersion'),
    darkMode: localStorage.getItem('darkMode'),
    shoppingListCount: JSON.parse(localStorage.getItem('shoppingList') || '[]').length
};
output.textContent = JSON.stringify(data, null, 2);
</script>
</body>
</html>
"@
        $tempHtml | Out-File -FilePath "temp-status.html" -Encoding UTF8
        
        Write-Host "📋 Abrindo visualizador de status..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Certifique-se de que o servidor está rodando em http://localhost:3004" -ForegroundColor Yellow
        Write-Host ""
        
        Start-Process "http://localhost:3004/temp-status.html"
        
        Start-Sleep -Seconds 3
        Remove-Item "temp-status.html" -ErrorAction SilentlyContinue
        
        Write-Host ""
        pause
    }
    
    "0" {
        Write-Host ""
        Write-Host "👋 Até logo!" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
        Write-Host ""
        pause
    }
}

