# Script para Corrigir Menu Lateral
# Lista de Compras IA v1.0.9

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔧 CORRIGINDO MENU LATERAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Parar processos Node
Write-Host "[1/7] Parando processos Node..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ Processos parados" -ForegroundColor Green
Write-Host ""

# 2. Limpar cache do navegador (instrução)
Write-Host "[2/7] IMPORTANTE: Limpar cache do navegador" -ForegroundColor Yellow
Write-Host "   → Pressione Ctrl + Shift + Delete" -ForegroundColor White
Write-Host "   → Ou abra em aba anônima (Ctrl + Shift + N)" -ForegroundColor White
Write-Host ""
pause

# 3. Limpar cache do Vite
Write-Host "[3/7] Limpando cache do Vite..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Write-Host "   ✓ Cache do Vite limpo" -ForegroundColor Green
Write-Host ""

# 4. Verificar arquivos essenciais
Write-Host "[4/7] Verificando arquivos..." -ForegroundColor Yellow
if (Test-Path "App.tsx") {
    Write-Host "   ✓ App.tsx existe" -ForegroundColor Green
} else {
    Write-Host "   ✗ App.tsx não encontrado!" -ForegroundColor Red
    exit 1
}
if (Test-Path "index.tsx") {
    Write-Host "   ✓ index.tsx existe" -ForegroundColor Green
} else {
    Write-Host "   ✗ index.tsx não encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Verificar dependências
Write-Host "[5/7] Verificando dependências..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   → Instalando dependências..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ✗ Erro na instalação!" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✓ Dependências instaladas" -ForegroundColor Green
}
Write-Host ""

# 6. Criar arquivo de teste do menu
Write-Host "[6/7] Criando arquivo de teste..." -ForegroundColor Yellow
$testMenuHtml = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste Menu - Lista de Compras IA</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f0f0f0;
        }
        .status-box {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .button {
            background: #4ECDC4;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
            font-weight: bold;
        }
        .button:hover {
            background: #3db8b0;
        }
        .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 5px;
            margin-left: 10px;
            font-weight: bold;
        }
        .status.ok { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
        .code {
            background: #1e1e1e;
            color: #4ECDC4;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>🔧 Teste do Menu Lateral</h1>
    
    <div class="status-box">
        <h2>📊 Status Atual</h2>
        <p><strong>URL:</strong> <span id="current-url"></span></p>
        <p><strong>React Carregado:</strong> <span id="react-status" class="status"></span></p>
        <p><strong>App Carregado:</strong> <span id="app-status" class="status"></span></p>
        <p><strong>Menu Disponível:</strong> <span id="menu-status" class="status"></span></p>
    </div>
    
    <div class="status-box">
        <h2>🧪 Testes</h2>
        <button class="button" onclick="clearCache()">🗑️ Limpar Cache</button>
        <button class="button" onclick="testMenu()">🧪 Testar Menu</button>
        <button class="button" onclick="goToApp()">➡️ Ir para o App</button>
        <button class="button" onclick="reloadApp()">🔄 Recarregar App</button>
    </div>
    
    <div class="status-box">
        <h2>📋 Instruções</h2>
        <ol>
            <li>Clique em "Limpar Cache" para resetar tudo</li>
            <li>Clique em "Ir para o App" para acessar o app</li>
            <li>Procure o botão "MENU" (grande, verde, canto superior esquerdo)</li>
            <li>Clique no botão "MENU" para abrir o menu lateral</li>
            <li>Verifique se a seção "Ferramentas" existe com todos os botões</li>
        </ol>
    </div>
    
    <div class="status-box">
        <h2>📝 Console de Logs</h2>
        <div class="code" id="log-console"></div>
    </div>
    
    <script>
        function addLog(message) {
            const logConsole = document.getElementById('log-console');
            const timestamp = new Date().toLocaleTimeString();
            logConsole.innerHTML += \`<div>[\${timestamp}] \${message}</div>\`;
            logConsole.scrollTop = logConsole.scrollHeight;
        }
        
        function updateStatus() {
            document.getElementById('current-url').textContent = window.location.href;
            
            // Verificar React
            const reactStatus = document.getElementById('react-status');
            if (window.React) {
                reactStatus.textContent = 'SIM ✓';
                reactStatus.className = 'status ok';
            } else {
                reactStatus.textContent = 'NÃO ✗';
                reactStatus.className = 'status error';
            }
            
            // Verificar App
            const appStatus = document.getElementById('app-status');
            const root = document.getElementById('root');
            if (root && root.children.length > 0) {
                appStatus.textContent = 'SIM ✓';
                appStatus.className = 'status ok';
            } else {
                appStatus.textContent = 'NÃO ✗';
                appStatus.className = 'status error';
            }
            
            // Verificar Menu (simulado)
            const menuStatus = document.getElementById('menu-status');
            menuStatus.textContent = 'Verificar no App';
            menuStatus.className = 'status';
            
            addLog('Status atualizado');
        }
        
        function clearCache() {
            addLog('🗑️ Limpando cache...');
            localStorage.clear();
            sessionStorage.clear();
            addLog('✓ Cache limpo!');
            alert('Cache limpo! Recarregue a página.');
        }
        
        function testMenu() {
            addLog('🧪 Testando menu...');
            addLog('→ Abrindo app em nova aba');
            window.open('/index.html', '_blank');
        }
        
        function goToApp() {
            addLog('➡️ Redirecionando para o app...');
            window.location.href = '/index.html';
        }
        
        function reloadApp() {
            addLog('🔄 Recarregando app...');
            localStorage.clear();
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 500);
        }
        
        // Inicializar
        addLog('🚀 Página de teste carregada');
        updateStatus();
        setInterval(updateStatus, 3000);
    </script>
</body>
</html>
"@

$testMenuHtml | Out-File -FilePath "test-menu.html" -Encoding UTF8
Write-Host "   ✓ Arquivo de teste criado: test-menu.html" -ForegroundColor Green
Write-Host ""

# 7. Iniciar servidor
Write-Host "[7/7] Iniciando servidor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Configuração completa!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Aguarde o servidor iniciar" -ForegroundColor White
Write-Host "   2. Acesse: http://localhost:3004/test-menu.html" -ForegroundColor White
Write-Host "   3. Clique em 'Ir para o App'" -ForegroundColor White
Write-Host "   4. Procure o botão 'MENU' (grande, verde)" -ForegroundColor White
Write-Host "   5. Clique para abrir o menu lateral" -ForegroundColor White
Write-Host ""
Write-Host "Servidor rodando em: http://localhost:3004" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

npm run dev

