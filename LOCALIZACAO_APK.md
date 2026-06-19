# 📱 LOCALIZAÇÃO DO APK - Lista de Compras IA

## 📍 **ONDE O APK É GERADO**

### **Caminho Completo:**
```
E:\app-list-compras\android\app\build\outputs\apk\debug\app-debug.apk
```

### **Estrutura de Pastas:**
```
android/
└── app/
    └── build/                    ← Criado após build
        └── outputs/
            └── apk/
                └── debug/
                    └── app-debug.apk  ← SEU APK AQUI!
```

---

## 🚀 **COMO GERAR O APK**

### **Método 1: Via Android Studio (RECOMENDADO)**

1. **Abra o Android Studio:**
   ```powershell
   npx cap open android
   ```

2. **No Android Studio:**
   - Aguarde o Gradle Sync terminar
   - **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Aguarde o build terminar
   - Clique em **"locate"** para ver o APK

### **Método 2: Via Linha de Comando**

```powershell
# 1. Ir para o diretório Android
cd android

# 2. Executar build
.\gradlew assembleDebug

# 3. Voltar para o diretório raiz
cd ..
```

### **Método 3: Script Automático**

```powershell
# Execute este script
.\build-apk-atualizado.ps1
```

---

## 📂 **VERIFICAR SE O APK FOI GERADO**

### **Via PowerShell:**
```powershell
# Verificar se a pasta existe
Test-Path "android\app\build\outputs\apk\debug\app-debug.apk"

# Listar conteúdo da pasta
Get-ChildItem "android\app\build\outputs\apk\debug\" -ErrorAction SilentlyContinue

# Ver informações do APK
Get-Item "android\app\build\outputs\apk\debug\app-debug.apk" -ErrorAction SilentlyContinue
```

### **Via Explorer:**
1. Abra o Windows Explorer
2. Navegue para: `E:\app-list-compras\android\app\build\outputs\apk\debug\`
3. Procure pelo arquivo: `app-debug.apk`

---

## 📊 **INFORMAÇÕES DO APK**

| Propriedade | Valor |
|-------------|-------|
| **Nome do Arquivo** | app-debug.apk |
| **Tamanho** | ~15-25 MB (aproximado) |
| **Tipo** | Debug (para testes) |
| **Package ID** | com.listacompras.ia |
| **Versão** | 1.0.0 |
| **Target SDK** | Android 14 (API 34) |

---

## ⚠️ **IMPORTANTE**

### **A pasta `build` só é criada APÓS o build!**

- ❌ **Antes do build:** `android\app\build\` não existe
- ✅ **Após o build:** `android\app\build\outputs\apk\debug\app-debug.apk` existe

### **Se não encontrar o APK:**

1. **Verifique se o build foi executado:**
   - Android Studio: Build → Build APK
   - Linha de comando: `.\gradlew assembleDebug`

2. **Verifique se não houve erros:**
   - No Android Studio: aba "Build"
   - No terminal: mensagens de erro

3. **Execute o build novamente:**
   ```powershell
   cd android
   .\gradlew clean
   .\gradlew assembleDebug
   ```

---

## 🔄 **FLUXO COMPLETO**

```
1. npm run build              ← Build do projeto web
2. npx cap sync android       ← Sincroniza com Android
3. npx cap open android       ← Abre Android Studio
4. Build → Build APK          ← Gera o APK
5. APK em: android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📱 **INSTALAR O APK**

### **No Dispositivo Android:**
1. Copie o APK para o dispositivo
2. Habilite "Fontes desconhecidas" nas configurações
3. Toque no APK para instalar

### **Via USB Debugging:**
```powershell
# Instalar diretamente via USB
adb install "android\app\build\outputs\apk\debug\app-debug.apk"
```

---

## 🎯 **STATUS ATUAL**

- ✅ **Projeto configurado**
- ✅ **Build web concluído**
- ✅ **Sincronização Android concluída**
- ✅ **Android Studio aberto**
- ⏳ **Aguardando build do APK**

**Próximo passo:** Execute o build no Android Studio para gerar o APK!




