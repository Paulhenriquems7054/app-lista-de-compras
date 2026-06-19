# 🚀 Como Iniciar o Servidor - Lista de Compras IA

## ✅ Correções Aplicadas:

1. ✅ **node_modules limpo** - Removido completamente
2. ✅ **package-lock.json removido** - Cache limpo
3. ✅ **192 pacotes instalados** - Todas as dependências
4. ✅ **Vite 7.1.7 instalado** - Verificado com `npx vite --version`
5. ✅ **vite.config.js correto** - Configuração válida
6. ✅ **package.json correto** - type: "module" presente

---

## 🎯 Para Iniciar o Servidor:

### Opção 1: Comando direto
```bash
npm run dev
```

### Opção 2: Se houver erro de porta
```bash
npx vite --port 3005
```

### Opção 3: Modo debug
```bash
npx vite --debug
```

---

## 📋 Verificações:

### 1. Verificar se Vite está instalado:
```bash
npx vite --version
```
**Resultado esperado:** `vite/7.1.7 win32-x64 node-v20.19.5`

### 2. Verificar dependências:
```bash
npm list vite @vitejs/plugin-react --depth=0
```

### 3. Verificar porta em uso:
```bash
netstat -ano | findstr :3004
```

---

## 🔧 Se o servidor não iniciar:

### 1. Limpar cache do navegador
- Pressione `Ctrl + Shift + Del`
- Limpe cache e cookies

### 2. Reiniciar terminal
- Feche e abra um novo terminal
- Execute: `npm run dev`

### 3. Verificar processos Node
```bash
Get-Process -Name "node" | Stop-Process -Force
npm run dev
```

### 4. Reinstalar tudo
```bash
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
npm run dev
```

---

## 🌐 URLs de Acesso:

Após iniciar, o servidor estará disponível em:
- **http://localhost:3004/** (porta padrão)
- **http://localhost:3005/** (porta alternativa)

---

## 📦 Dependências Instaladas:

### Principais:
- ✅ **vite** @ 7.1.7
- ✅ **@vitejs/plugin-react** @ 4.7.0  
- ✅ **react** @ 18.3.1
- ✅ **react-dom** @ 18.3.1
- ✅ **framer-motion** @ 12.23.24
- ✅ **tailwindcss** @ 3.4.18
- ✅ **@google/genai** @ 1.24.0

### Desenvolvimento:
- ✅ **typescript** @ 5.8.2
- ✅ **@types/node** @ 22.18.10

**Total: 192 pacotes**

---

## ⚠️ Problemas Comuns:

### "Cannot find package '@vitejs/plugin-react'"
**Solução:** Execute `npm install --force`

### "Port 3004 is already in use"
**Solução:** Use porta alternativa `npx vite --port 3005`

### "ENOENT: no such file or directory"
**Solução:** Execute `npm install` novamente

---

## 🎨 Recursos do App:

✅ SplashScreen animada com Framer Motion  
✅ Assistente IA com Google Gemini  
✅ Reconhecimento de voz (Web Speech API)  
✅ Lista de compras inteligente  
✅ Categorias com itens sugeridos  
✅ Dark mode  
✅ Responsivo (mobile/desktop)  

---

**Desenvolvido com ❤️ - Lista de Compras Inteligente com IA**

