# 🛒 Lista de Compras IA - App Completo e Profissional

<div align="center">

**Um aplicativo moderno e completo de lista de compras com Inteligência Artificial**

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](.)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](.)
[![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-orange)](.)

</div>

---

## 🎯 **FUNCIONALIDADES COMPLETAS**

### ✨ **7 Funcionalidades Principais Implementadas:**

| Funcionalidade | Descrição | Status |
|----------------|-----------|--------|
| 📱 **PWA** | Instalável no celular, funciona offline | ✅ |
| 💾 **Backup/Export** | Export CSV/JSON, backup automático | ✅ |
| 💰 **Orçamento** | Gestão de preços e controle financeiro | ✅ |
| 🔔 **Notificações** | Lembretes e alertas inteligentes | ✅ |
| 👥 **Compartilhamento** | Compartilhe listas via código/WhatsApp | ✅ |
| 📊 **Relatórios** | Análise avançada de gastos e tendências | ✅ |
| 📥 **Importação** | Importe CSV, JSON, TXT de qualquer fonte | ✅ |

---

## 🚀 **COMEÇAR**

### **Pré-requisitos:**
- Node.js (v20+)
- npm ou yarn

### **Instalação:**

```bash
# 1. Clone o repositório
git clone <seu-repo>
cd app-list-compras

# 2. Instale as dependências
npm install

# 3. Configure a API Key do Gemini (opcional para IA)
# Edite .env.local e adicione:
# VITE_GEMINI_API_KEY=sua_api_key_aqui

# 4. Inicie o servidor
npm run dev

# 5. Acesse no navegador
# http://localhost:3004/apresentacao.html
```

---

## 📱 **PWA - Progressive Web App**

### **Instalar no Celular:**
1. Abra o app no navegador mobile
2. Clique no botão "📱 Instalar App"
3. Confirme a instalação
4. Use como app nativo!

### **Benefícios:**
- ✅ Funciona offline
- ✅ Notificações push
- ✅ Ícone na tela inicial
- ✅ Experiência de app nativo
- ✅ Atualizações automáticas

---

## 🤖 **APK ANDROID**

### **Gerar APK:**

**Método Rápido (Script Automático):**
```bash
.\build-android.ps1
```

**Método Manual:**
```bash
# 1. Build do projeto
npm run build

# 2. Sync com Android
npx cap sync android

# 3. Abrir Android Studio
npx cap open android

# 4. No Android Studio: Build → Build APK
```

**APK gerado em:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### **Pré-requisitos:**
- ✅ Android Studio
- ✅ Java JDK 11+
- ✅ Android SDK

**📖 Guia Completo:** [GERAR_APK_ANDROID.md](GERAR_APK_ANDROID.md)  
**⚡ Guia Rápido:** [ANDROID_QUICK_START.md](ANDROID_QUICK_START.md)

---

## 💾 **Backup e Export**

### **Formatos Suportados:**
- **JSON** - Backup completo com metadados
- **CSV** - Para planilhas (Excel, Google Sheets)

### **Recursos:**
- ✅ Export completo
- ✅ Import de backups
- ✅ 5 backups automáticos
- ✅ Restauração rápida
- ✅ Validação de dados

---

## 💰 **Gestão de Orçamento**

### **Recursos:**
- 💰 Configure orçamento total
- 📊 Adicione preços aos itens
- 📈 Preço médio automático
- 🎯 Sugestões baseadas no histórico
- ⚠️ Alertas de orçamento
- 📊 Relatórios em tempo real

---

## 🔔 **Notificações e Lembretes**

### **Tipos de Notificação:**
- 🛒 Lembretes de dia de compras
- ⚠️ Alertas de baixo estoque
- 💰 Alertas de preços
- 📅 Horários personalizáveis
- 🗓️ Dias da semana configuráveis

---

## 👥 **Compartilhamento de Listas**

### **Como Funciona:**
1. Crie código de compartilhamento
2. Configure expiração (1-30 dias)
3. Compartilhe via:
   - 📱 WhatsApp
   - 📧 Email
   - 🔗 Link direto
   - 🔢 Código manual

### **Recursos:**
- ✅ Listas públicas e privadas
- ✅ Importação por código
- ✅ Expiração automática
- ✅ Histórico de compartilhamentos

---

## 📊 **Relatórios Avançados**

### **4 Tipos de Relatórios:**

1. **💰 Gastos** - Totais, médias, estatísticas
2. **📂 Categorias** - Análise por categoria
3. **📈 Tendências** - Padrões semanais/mensais
4. **🔄 Frequência** - Itens mais comprados

### **Períodos:**
- 7 dias, 30 dias, 90 dias, 1 ano, todo período

---

## 📥 **Importação de Dados Externos**

### **Formatos Suportados:**

#### **1. CSV (Planilhas)**
```csv
Nome,Quantidade,Categoria,Preço
Leite,2,Laticínios,5.50
Pão,3,Padaria,4.00
```

#### **2. JSON (Estruturado)**
```json
{
  "items": [
    {
      "nome": "Leite",
      "quantidade": "2",
      "categoria": "Laticínios",
      "preco_medio": 5.50
    }
  ]
}
```

#### **3. TXT (Lista Simples)**
```
Leite
2 Pães
Arroz (5kg)
Café - 500g
```

### **Recursos:**
- ✅ Detecção automática de formato
- ✅ Mapeamento inteligente de categorias
- ✅ Validação de dados
- ✅ Preview antes de importar
- ✅ Adicionar ou substituir lista

### **Fontes Suportadas:**
- Google Sheets
- Excel
- Apps de notas
- WhatsApp/Telegram
- Qualquer arquivo CSV/JSON/TXT

**📖 Veja:** [GUIA_IMPORTACAO.md](GUIA_IMPORTACAO.md) para exemplos completos

---

## 🤖 **Inteligência Artificial**

### **Assistente IA com Google Gemini:**
- 🗣️ Comandos por voz
- 💬 Chat inteligente
- 🎯 Sugestões de categorias
- 📊 Análise de padrões
- 💡 Insights automáticos

### **Configurar IA:**
1. Obtenha API Key: https://aistudio.google.com/apikey
2. Adicione em `.env.local`:
   ```
   VITE_GEMINI_API_KEY=sua_chave_aqui
   ```
3. Reinicie o servidor

**📖 Veja:** [CONFIGURACAO_IA.md](CONFIGURACAO_IA.md)

---

## 📁 **Estrutura do Projeto**

```
app-list-compras/
├── components/          # Componentes React
│   ├── ImportData.tsx   # 📥 Importação de dados
│   ├── BackupExport.tsx # 💾 Backup e export
│   ├── PriceBudget.tsx  # 💰 Orçamento
│   ├── Notifications.tsx # 🔔 Notificações
│   ├── ListSharing.tsx  # 👥 Compartilhamento
│   ├── AdvancedReports.tsx # 📊 Relatórios
│   ├── AIChat.tsx       # 🤖 Chat IA
│   └── ...
├── services/
│   └── geminiService.ts # Integração Gemini
├── public/
│   ├── sw.js           # Service Worker (PWA)
│   ├── manifest.json   # Manifest PWA
│   └── exemplos/       # Arquivos de exemplo
│       ├── lista-exemplo.csv
│       ├── lista-exemplo.json
│       └── lista-exemplo.txt
├── App.tsx             # App principal
├── index.html          # HTML principal
├── apresentacao.html   # Tela de apresentação
└── README.md           # Este arquivo
```

---

## 🎨 **Interface Moderna**

- 🌓 **Dark Mode** - Tema escuro padrão
- 📱 **Responsivo** - Desktop, tablet e mobile
- ⚡ **Rápido** - Performance otimizada
- 🎯 **Intuitivo** - UX pensada no usuário
- 🎨 **Animações** - Transições suaves

---

## 📚 **Documentação Completa**

| Documento | Descrição |
|-----------|-----------|
| [FUNCIONALIDADES_IMPLEMENTADAS.md](FUNCIONALIDADES_IMPLEMENTADAS.md) | Guia completo de todas as funcionalidades |
| [GUIA_IMPORTACAO.md](GUIA_IMPORTACAO.md) | Tutorial detalhado de importação |
| [CONFIGURACAO_IA.md](CONFIGURACAO_IA.md) | Como configurar a IA Gemini |
| [START_SERVER.md](START_SERVER.md) | Guia para iniciar o servidor |
| [GUIA_RAPIDO_INICIO.md](GUIA_RAPIDO_INICIO.md) | Quick start guide |

---

## 🧪 **Testar Importação**

Use os arquivos de exemplo fornecidos:

```bash
# Exemplos disponíveis em:
public/exemplos/lista-exemplo.csv
public/exemplos/lista-exemplo.json
public/exemplos/lista-exemplo.txt
```

**Teste agora:**
1. Abra o app
2. Clique em 📥 Importar
3. Selecione um arquivo de exemplo
4. Veja a mágica acontecer! ✨

---

## 🛠️ **Tecnologias Utilizadas**

| Tecnologia | Uso |
|------------|-----|
| React 18 | Framework principal |
| TypeScript | Tipagem forte |
| Vite | Build tool |
| TailwindCSS | Estilização |
| Google Gemini | Inteligência Artificial |
| Service Worker | PWA e offline |
| LocalStorage | Persistência de dados |
| Web Speech API | Comandos de voz |
| Notification API | Notificações push |

---

## 📊 **Estatísticas do Projeto**

- ✅ **7 Funcionalidades** principais completas
- 📱 **100% PWA** compliant
- 🎯 **15+ Componentes** React reutilizáveis
- 📝 **3 Formatos** de importação (CSV, JSON, TXT)
- 🔔 **4 Tipos** de notificações
- 📊 **4 Tipos** de relatórios
- 🌐 **3 Formas** de compartilhamento

---

## 🎯 **Casos de Uso**

### **1. Uso Pessoal**
- Organize suas compras
- Controle seu orçamento
- Receba lembretes
- Analise seus gastos

### **2. Uso Familiar**
- Compartilhe listas com família
- Todos contribuem na lista
- Sincronização via código
- Histórico compartilhado

### **3. Uso Profissional**
- Compras para empresas
- Controle de estoque básico
- Relatórios de gastos
- Export para contabilidade

### **4. Migração de Outros Apps**
- Importe de qualquer fonte
- Mantenha seu histórico
- Ganhe novas funcionalidades
- Zero perda de dados

---

## 🚀 **Deploy**

### **Build para Produção:**

```bash
npm run build
```

### **Preview do Build:**

```bash
npm run preview
```

### **Deploy Recomendado:**
- Vercel
- Netlify
- GitHub Pages
- Render
- Firebase Hosting

---

## 🤝 **Contribuir**

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Fazer Pull Requests
- Melhorar a documentação

---

## 📝 **Licença**

Este projeto está sob a licença MIT.

---

## 🎉 **Agradecimentos**

- Google Gemini AI
- Comunidade React
- Contribuidores Open Source

---

## 📞 **Suporte**

- 📧 Email: [seu-email]
- 🐛 Issues: [GitHub Issues]
- 💬 Discussões: [GitHub Discussions]

---

<div align="center">

**⭐ Se você gostou, dê uma estrela no repositório!**

**Desenvolvido com ❤️ e ☕**

</div># app-lista-de-compras
