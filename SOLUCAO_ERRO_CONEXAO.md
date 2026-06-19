# 🔧 SOLUÇÃO: Erro de Conexão ERR_CONNECTION_REFUSED

## ❌ **PROBLEMA IDENTIFICADO**

O app Android estava tentando acessar `https://localhost` mas o servidor Vite roda em `http://localhost:3004`, causando o erro `ERR_CONNECTION_REFUSED`.

---

## ✅ **CORREÇÕES APLICADAS**

### **1. Configuração do Capacitor Corrigida**

**Arquivo:** `capacitor.config.json`

**Antes:**
```json
"server": {
  "androidScheme": "https",
  "hostname": "localhost",
  "url": "https://localhost"
}
```

**Depois:**
```json
"server": {
  "androidScheme": "http",
  "hostname": "localhost",
  "url": "http://localhost:3004"
}
```

**Mudanças:**
- ✅ `androidScheme`: `https` → `http`
- ✅ `url`: `https://localhost` → `http://localhost:3004`

---

## 🚀 **SCRIPTS CRIADOS PARA FACILITAR**

### **1. Desenvolvimento com Live Reload**
```powershell
.\dev-android.ps1
```

**O que faz:**
- ✅ Build do projeto web
- ✅ Sincroniza com Android
- ✅ Inicia servidor de desenvolvimento
- ✅ Abre Android Studio
- ✅ Configura live reload

### **2. Gerar APK Atualizado**
```powershell
.\build-apk-atualizado.ps1
```

**O que faz:**
- ✅ Limpa cache e builds antigos
- ✅ Build do projeto web
- ✅ Sincroniza com Android
- ✅ Abre Android Studio para build final

---

## 📱 **COMO USAR AGORA**

### **Para Desenvolvimento:**
1. Execute: `.\dev-android.ps1`
2. No Android Studio, execute o app
3. O app se conectará automaticamente ao servidor
4. Alterações no código serão refletidas em tempo real

### **Para Gerar APK:**
1. Execute: `.\build-apk-atualizado.ps1`
2. No Android Studio: **Build → Build APK**
3. APK será gerado em: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 🔍 **VERIFICAÇÕES**

### **1. Servidor Rodando:**
```powershell
# Verificar se o servidor está rodando
netstat -ano | findstr ":3004"
```

### **2. App Conectado:**
- O app Android deve abrir sem erros
- Deve carregar a interface normalmente
- Não deve mais mostrar "ERR_CONNECTION_REFUSED"

### **3. Live Reload Funcionando:**
- Faça uma alteração no código
- Execute: `npm run build`
- Execute: `npx cap sync android`
- Recompile no Android Studio
- A alteração deve aparecer no app

---

## 🐛 **TROUBLESHOOTING**

### **Se ainda der erro de conexão:**

1. **Verificar se o servidor está rodando:**
   ```powershell
   npm run dev
   ```

2. **Verificar configuração do Capacitor:**
   ```json
   "url": "http://localhost:3004"
   ```

3. **Sincronizar novamente:**
   ```powershell
   npx cap sync android
   ```

4. **Limpar cache do Android:**
   - No Android Studio: **Build → Clean Project**
   - Depois: **Build → Rebuild Project**

### **Se o APK não gerar:**

1. **Verificar se Android Studio está configurado**
2. **Aceitar licenças do SDK**
3. **Aguardar Gradle Sync terminar**
4. **Verificar se Java JDK está instalado**

---

## 📋 **RESUMO DAS CORREÇÕES**

| Problema | Solução | Status |
|----------|---------|--------|
| URL incorreta | `https://localhost` → `http://localhost:3004` | ✅ Corrigido |
| Esquema HTTPS | `https` → `http` | ✅ Corrigido |
| Scripts de automação | Criados `dev-android.ps1` e `build-apk-atualizado.ps1` | ✅ Criado |
| Documentação | Guia de solução criado | ✅ Documentado |

---

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ **Execute o script de desenvolvimento:**
   ```powershell
   .\dev-android.ps1
   ```

2. ✅ **Teste o app no Android Studio**

3. ✅ **Se funcionar, gere o APK:**
   ```powershell
   .\build-apk-atualizado.ps1
   ```

4. ✅ **Instale o APK no dispositivo**

---

## 📞 **SUPORTE**

Se ainda houver problemas:
- Verifique se o Android Studio está instalado
- Verifique se as licenças do SDK foram aceitas
- Verifique se o Java JDK está configurado
- Execute os scripts como Administrador se necessário




