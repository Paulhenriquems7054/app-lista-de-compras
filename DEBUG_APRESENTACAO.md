# 🎨 DEBUG - TELA DE APRESENTAÇÃO

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **Sistema de Versão**
- Agora o app usa controle de versão (`APP_VERSION = '1.0.0'`)
- Na primeira instalação, **SEMPRE** mostra a apresentação
- Se atualizar a versão, mostra a apresentação novamente

### 2. **Logs Detalhados**
- Console mostra informações completas sobre o estado do app
- Facilita identificar problemas

### 3. **Fluxo Corrigido**
- `index.html` NÃO marca `hasSeenPresentation` antes de redirecionar
- Apenas `apresentacao.js` marca ao clicar em "Entrar"
- Delay de 100ms no redirecionamento para garantir que o DOM está pronto

---

## 📱 COMO TESTAR

### **Passo 1: Desinstalar versão antiga**
```
Configurações > Apps > Lista de Compras IA > Desinstalar
```

### **Passo 2: Instalar nova versão**
```bash
adb install E:\app-list-compras\android\app\build\outputs\apk\debug\app-debug.apk
```

### **Passo 3: Abrir o app**
- **DEVE** mostrar a tela de apresentação
- Logo 1024.png centralizado
- Título "LISTA DE COMPRAS" em duas linhas
- Botão "Entrar"

### **Passo 4: Clicar em "Entrar"**
- Animação de transição
- Redireciona para o app principal

### **Passo 5: Fechar e abrir novamente**
- **NÃO DEVE** mostrar apresentação de novo
- Vai direto para o app principal

---

## 🔍 VERIFICAR LOGS (via Chrome DevTools)

### **Conectar via USB:**
1. Conectar celular no PC via USB
2. Ativar **Depuração USB** no celular
3. Abrir Chrome no PC: `chrome://inspect`
4. Clicar em "inspect" no app Lista de Compras IA

### **Logs esperados na PRIMEIRA abertura:**
```
🚀 Iniciando app...
📍 Location: https://localhost/index.html
🔧 Capacitor: true
👁️ Já viu apresentação: null
📦 Versão atual: 1.0.0
💾 Versão salva: null
🎨 Primeira instalação ou nova versão - mostrando apresentação...
```

### **Depois redireciona e mostra:**
```
✅ Apresentacao.html carregada
📍 URL: https://localhost/apresentacao.html
💾 LocalStorage: null
🎨 Apresentação carregada
📱 Capacitor: true
💾 hasSeenPresentation: null
```

### **Ao clicar em "Entrar":**
```
(marca hasSeenPresentation: true)
(redireciona para index.html)
```

### **Logs na SEGUNDA abertura (após clicar Entrar):**
```
🚀 Iniciando app...
👁️ Já viu apresentação: true
📦 Versão atual: 1.0.0
💾 Versão salva: 1.0.0
📱 Carregando app principal...
```

---

## 🛠️ SOLUÇÃO DE PROBLEMAS

### **Se a apresentação NÃO aparecer:**

#### **Opção 1: Limpar dados do app**
```
Configurações > Apps > Lista de Compras IA > Armazenamento > Limpar dados
```

#### **Opção 2: Via ADB**
```bash
# Limpar dados do app
adb shell pm clear com.listacompras.ia

# Reinstalar
adb uninstall com.listacompras.ia
adb install app-debug.apk
```

#### **Opção 3: Via Chrome DevTools**
```javascript
// No console do Chrome (chrome://inspect)
localStorage.clear();
location.reload();
```

#### **Opção 4: Forçar reset**
```
Abrir: https://localhost/apresentacao.html?reset=true
```

---

## 🎯 CHECKLIST DE TESTES

- [ ] App abre e mostra apresentação na primeira vez
- [ ] Logo 1024.png aparece corretamente
- [ ] Título "LISTA DE" e "COMPRAS" em duas linhas
- [ ] Botão "Entrar" funciona
- [ ] Transição animada para app principal
- [ ] Segunda abertura vai direto para o app
- [ ] Menu funciona (☰)
- [ ] Dark mode funciona (☀️/🌙)
- [ ] Botão voltar em cada tela (←)
- [ ] App não invade bordas do celular

---

## 📦 ARQUIVOS MODIFICADOS

1. **`index.html`**
   - Sistema de versão (`APP_VERSION`)
   - Logs detalhados
   - Delay no redirecionamento (100ms)

2. **`apresentacao.html`**
   - Logs de debug
   - Suporte para `?reset=true`

3. **`apresentacao.js`**
   - Logs adicionais
   - Confirmação de estado

---

## 📊 INFORMAÇÕES DO APK

- **Localização:** `E:\app-list-compras\android\app\build\outputs\apk\debug\app-debug.apk`
- **Tamanho:** 14.27 MB
- **Data:** 13/10/2025 09:21:52
- **Versão:** 1.0.0

---

## 🆘 SE NADA FUNCIONAR

Compartilhe os logs do Chrome DevTools (chrome://inspect):
- Logs do console ao abrir o app
- Erros (se houver)
- Estado do localStorage

Isso vai ajudar a identificar o problema exato! 🔍

