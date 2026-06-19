# 📱 GUIA COMPLETO - GERAR APK ANDROID

## ✅ **CAPACITOR INSTALADO E CONFIGURADO!**

O projeto está configurado para gerar APK Android usando **Capacitor**.

---

## 🎯 **PRÉ-REQUISITOS**

### **1. Android Studio**
Você precisa ter o Android Studio instalado:

📥 **Download:** https://developer.android.com/studio

**Componentes necessários:**
- ✅ Android SDK
- ✅ Android SDK Platform
- ✅ Android SDK Build-Tools
- ✅ Android Emulator (opcional)

### **2. Java JDK**
- ✅ JDK 11 ou superior
- ✅ Variável JAVA_HOME configurada

### **3. Variáveis de Ambiente**
Adicione ao PATH:
```
C:\Users\SeuUsuario\AppData\Local\Android\Sdk\platform-tools
C:\Users\SeuUsuario\AppData\Local\Android\Sdk\tools
```

---

## 🚀 **PASSOS PARA GERAR O APK**

### **Opção 1: Gerar via Android Studio (RECOMENDADO)**

#### **Passo 1: Abrir projeto no Android Studio**
```bash
cd E:\app-list-compras
npx cap open android
```

Isso abrirá o Android Studio com o projeto Android.

#### **Passo 2: Aguardar Gradle Sync**
- O Android Studio sincronizará automaticamente
- Aguarde o processo terminar (pode demorar na primeira vez)

#### **Passo 3: Gerar APK**
No Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Aguarde o build terminar
3. Clique em **"locate"** para ver o APK gerado

**Local do APK:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### **Opção 2: Gerar via Linha de Comando**

#### **Passo 1: Build do projeto web**
```bash
npm run build
```

#### **Passo 2: Copiar assets para Android**
```bash
npx cap sync android
```

#### **Passo 3: Gerar APK Debug**
```bash
cd android
.\gradlew assembleDebug
cd ..
```

**APK gerado em:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 **GERAR APK RELEASE (PARA PUBLICAÇÃO)**

### **Passo 1: Criar Keystore**
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias lista-compras -keyalg RSA -keysize 2048 -validity 10000
```

**Informações necessárias:**
- Password do keystore
- Nome, organização, cidade, estado, país
- Password do alias

**⚠️ IMPORTANTE:** Guarde o keystore e as senhas em local seguro!

### **Passo 2: Configurar build.gradle**

Edite: `android/app/build.gradle`

Adicione antes de `android {`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Dentro de `android { ... }`, adicione:
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### **Passo 3: Criar keystore.properties**

Crie arquivo: `android/keystore.properties`

```properties
storePassword=SUA_SENHA_KEYSTORE
keyPassword=SUA_SENHA_ALIAS
keyAlias=lista-compras
storeFile=../my-release-key.keystore
```

### **Passo 4: Gerar APK Release**
```bash
cd android
.\gradlew assembleRelease
cd ..
```

**APK Release gerado em:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 **COMANDOS ÚTEIS**

### **Build e Sync**
```bash
# Build do projeto web
npm run build

# Sincronizar com Android
npx cap sync android

# Abrir no Android Studio
npx cap open android
```

### **Atualizar código**
```bash
# Sempre que alterar o código web
npm run build
npx cap sync android
```

### **Limpar build**
```bash
cd android
.\gradlew clean
cd ..
```

### **Verificar dispositivos conectados**
```bash
adb devices
```

### **Instalar APK no dispositivo**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔧 **CONFIGURAÇÕES DO APP**

### **Alterar nome do app:**
Edite: `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Lista de Compras IA</string>
```

### **Alterar ícone:**
Substitua os arquivos em:
```
android/app/src/main/res/mipmap-*/ic_launcher.png
android/app/src/main/res/mipmap-*/ic_launcher_round.png
```

### **Alterar versão:**
Edite: `android/app/build.gradle`
```gradle
defaultConfig {
    versionCode 1
    versionName "1.0.0"
}
```

### **Alterar permissões:**
Edite: `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🎨 **PERSONALIZAR SPLASH SCREEN**

### **1. Criar imagens:**
- `resources/splash.png` (2732x2732px)

### **2. Gerar automaticamente:**
```bash
npx cordova-res android --skip-config --copy
```

Ou manualmente coloque em:
```
android/app/src/main/res/drawable*/splash.png
```

---

## 📊 **TAMANHOS DE ÍCONES ANDROID**

| Densidade | Tamanho | Pasta |
|-----------|---------|-------|
| mdpi | 48x48 | mipmap-mdpi |
| hdpi | 72x72 | mipmap-hdpi |
| xhdpi | 96x96 | mipmap-xhdpi |
| xxhdpi | 144x144 | mipmap-xxhdpi |
| xxxhdpi | 192x192 | mipmap-xxxhdpi |

---

## 🐛 **PROBLEMAS COMUNS**

### **Problema 1: "Android SDK not found"**
**Solução:**
1. Instale Android Studio
2. Configure variável ANDROID_HOME:
   ```
   ANDROID_HOME=C:\Users\SeuUsuario\AppData\Local\Android\Sdk
   ```

### **Problema 2: "Gradle sync failed"**
**Solução:**
```bash
cd android
.\gradlew clean
.\gradlew build --refresh-dependencies
cd ..
```

### **Problema 3: "JDK not found"**
**Solução:**
1. Instale JDK 11+
2. Configure JAVA_HOME:
   ```
   JAVA_HOME=C:\Program Files\Java\jdk-11
   ```

### **Problema 4: Build muito lento**
**Solução:**
Edite: `android/gradle.properties`
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
org.gradle.parallel=true
org.gradle.daemon=true
```

---

## 📱 **TESTAR O APK**

### **Método 1: Dispositivo físico**
1. Habilite "Depuração USB" no Android
2. Conecte via USB
3. Execute:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### **Método 2: Emulador**
1. Abra Android Studio
2. AVD Manager → Create Virtual Device
3. Execute:
   ```bash
   npx cap run android
   ```

### **Método 3: Compartilhar APK**
1. Copie o APK do `android/app/build/outputs/apk/`
2. Envie via WhatsApp, Drive, etc.
3. Instale no dispositivo (habilite "Fontes desconhecidas")

---

## 🚀 **PUBLICAR NA GOOGLE PLAY STORE**

### **Passo 1: Criar conta Google Play Console**
- Taxa única: $25 USD
- https://play.google.com/console

### **Passo 2: Gerar App Bundle**
```bash
cd android
.\gradlew bundleRelease
cd ..
```

**Bundle gerado em:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

### **Passo 3: Upload na Play Console**
1. Criar novo app
2. Upload do AAB (não APK!)
3. Preencher store listing
4. Adicionar screenshots
5. Enviar para revisão

---

## 📋 **CHECKLIST PRÉ-PUBLICAÇÃO**

- [ ] Testar APK em múltiplos dispositivos
- [ ] Verificar permissões necessárias
- [ ] Adicionar política de privacidade
- [ ] Criar screenshots (min. 2)
- [ ] Escrever descrição atraente
- [ ] Definir categoria correta
- [ ] Testar todas as funcionalidades
- [ ] Verificar ícone e nome
- [ ] Assinar com keystore release
- [ ] Gerar AAB (não APK) para Play Store

---

## 🎯 **PRÓXIMOS PASSOS**

### **1. Gerar APK Debug (Teste):**
```bash
# Abrir Android Studio
npx cap open android

# Ou via comando
cd android
.\gradlew assembleDebug
cd ..
```

### **2. Localizar APK:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### **3. Instalar e Testar:**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📞 **COMANDOS RÁPIDOS**

```bash
# Build completo
npm run build && npx cap sync android && npx cap open android

# Apenas sync
npx cap sync android

# Abrir Android Studio
npx cap open android

# Gerar APK debug
cd android && .\gradlew assembleDebug && cd ..

# Gerar APK release
cd android && .\gradlew assembleRelease && cd ..

# Instalar no dispositivo
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🎉 **TUDO PRONTO!**

Seu projeto está configurado para gerar APK Android!

**Execute agora:**
```bash
npx cap open android
```

E no Android Studio:
**Build → Build APK**

---

## 📚 **RECURSOS ADICIONAIS**

- 📖 Documentação Capacitor: https://capacitorjs.com
- 🤖 Guias Android: https://developer.android.com
- 🏪 Play Console: https://play.google.com/console
- 💬 Stack Overflow: https://stackoverflow.com/questions/tagged/capacitor

---

<div align="center">

**🎊 Seu app está pronto para ser distribuído! 🎊**

**📱 Lista de Compras IA agora é um app Android completo! 📱**

</div>
