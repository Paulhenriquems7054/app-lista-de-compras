# ⚡ Guia Rápido - Iniciar o Servidor

## 🚨 STATUS ATUAL:

✅ **Vite 7.1.7 instalado e funcionando**  
✅ **192 pacotes instalados corretamente**  
✅ **Todas as dependências OK**  
❌ **Servidor não está iniciando automaticamente**

---

## 🎯 SOLUÇÃO RÁPIDA (Execute no PowerShell):

### **Opção 1: Comando Simples**
```powershell
cd E:\app-list-compras
npm run dev
```

### **Opção 2: Forçar com npx**
```powershell
cd E:\app-list-compras
npx vite
```

### **Opção 3: Especificar porta**
```powershell
cd E:\app-list-compras
npx vite --port 3004 --host localhost
```

### **Opção 4: Modo Debug**
```powershell
cd E:\app-list-compras
npx vite --debug --logLevel info
```

---

## 🔍 SE O ERRO "Cannot find package '@vitejs/plugin-react'" APARECER:

Execute estes comandos **UM POR VEZ**:

```powershell
# 1. Ir para o diretório
cd E:\app-list-compras

# 2. Limpar cache
npm cache clean --force

# 3. Remover node_modules
Remove-Item -Recurse -Force node_modules, package-lock.json

# 4. Reinstalar TUDO
npm install

# 5. Verificar se Vite funciona
npx vite --version

# 6. Iniciar servidor
npm run dev
```

---

## ✅ VERIFICAÇÕES ANTES DE INICIAR:

### 1. Verificar se está no diretório correto:
```powershell
Get-Location
# Deve mostrar: E:\app-list-compras
```

### 2. Verificar se Vite está instalado:
```powershell
npx vite --version
# Deve mostrar: vite/7.1.7 win32-x64 node-v20.19.5
```

### 3. Verificar se a porta está livre:
```powershell
netstat -ano | findstr ":3004"
# Se mostrar algo, a porta está em uso
```

### 4. Matar processos Node se necessário:
```powershell
Get-Process -Name "node" | Stop-Process -Force
```

---

## 📱 ACESSAR O APP:

Após iniciar o servidor, acesse:
- **http://localhost:3004**
- ou **http://localhost:3005** (se 3004 estiver ocupada)
- ou **http://127.0.0.1:3004**

---

## 🐛 TROUBLESHOOTING COMUM:

### **Erro: "Port 3004 is already in use"**
**Solução:**
```powershell
npx vite --port 3005
```

### **Erro: "ENOENT: no such file or directory"**
**Solução:**
```powershell
cd E:\app-list-compras
npm install
```

### **Erro: "Cannot find module"**
**Solução:**
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### **Navegador não carrega (localhost se recusou a conectar)**
**Causas possíveis:**
1. Servidor não iniciou → Ver logs no terminal
2. Porta bloqueada → Trocar para 3005
3. Firewall bloqueando → Permitir Node.js no firewall
4. Cache do navegador → Limpar cache (Ctrl+Shift+Del)

---

## 📋 CHECKLIST COMPLETO:

- [  ] 1. Abrir PowerShell como **Administrador**
- [  ] 2. Navegar: `cd E:\app-list-compras`
- [  ] 3. Verificar Vite: `npx vite --version`
- [  ] 4. Matar processos: `Get-Process node | Stop-Process -Force`
- [  ] 5. Iniciar servidor: `npm run dev`
- [  ] 6. Aguardar mensagem: **"ready in XXX ms"**
- [  ] 7. Ver URL no terminal (ex: http://localhost:3004)
- [  ] 8. Abrir navegador e acessar a URL
- [  ] 9. Aguardar SplashScreen animada (4 segundos)
- [  ] 10. Usar o app! 🎉

---

## 🎨 O QUE ESPERAR:

1. **SplashScreen animada** (4 segundos)
   - Logo com zoom e rotação
   - Letras aparecendo uma a uma
   - Som suave (sininho)

2. **Tela principal**
   - 9 categorias de compras
   - Busca e microfone funcionais
   - Dark mode ativado

3. **Funcionalidades**
   - ✅ Adicionar itens
   - ✅ Categorizar automaticamente
   - ✅ Assistente IA (precisa configurar API Key)
   - ✅ Reconhecimento de voz
   - ✅ Histórico de compras

---

## 🔑 CONFIGURAR API KEY (Opcional):

Para usar o Assistente IA:

1. Obter chave em: https://makersuite.google.com/app/apikey
2. Editar arquivo `.env.local`:
   ```
   VITE_GEMINI_API_KEY=sua_chave_aqui
   ```
3. Reiniciar servidor

---

## 💡 DICAS:

- Use `Ctrl+C` no terminal para parar o servidor
- Use `Ctrl+Shift+R` no navegador para recarregar sem cache
- Mantenha o terminal aberto enquanto usa o app
- Veja logs no terminal para debug

---

## 📞 COMANDOS ÚTEIS:

```powershell
# Ver processos Node rodando
Get-Process -Name "node"

# Matar todos os processos Node
Get-Process -Name "node" | Stop-Process -Force

# Ver portas em uso
netstat -ano | findstr "LISTENING"

# Limpar cache npm
npm cache clean --force

# Reinstalar dependências
npm install --force

# Atualizar npm
npm install -g npm@latest
```

---

**🚀 Tudo pronto! Execute `npm run dev` e aproveite!**

