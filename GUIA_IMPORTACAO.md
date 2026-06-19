# 📥 GUIA COMPLETO DE IMPORTAÇÃO DE DADOS

## 🎯 **FUNCIONALIDADE IMPLEMENTADA**

O app **Lista de Compras IA** agora permite importar dados externos de múltiplas fontes e formatos!

---

## 📋 **FORMATOS SUPORTADOS**

### ✅ **1. CSV (Comma-Separated Values)**
- Formato mais comum para planilhas
- Suporta vírgula (`,`) ou ponto-e-vírgula (`;`)
- Cabeçalho opcional

**Exemplo:**
```csv
Nome,Quantidade,Categoria,Preço
Leite,2,Laticínios,5.50
Pão,3,Padaria,4.00
Banana,1kg,Frutas,6.90
Detergente,2,Limpeza,3.50
```

### ✅ **2. JSON (JavaScript Object Notation)**
- Formato estruturado
- Suporta múltiplos layouts
- Campos flexíveis

**Exemplo 1 (Array direto):**
```json
[
  {
    "nome": "Leite",
    "quantidade": "2",
    "categoria": "Laticínios",
    "preco_medio": 5.50
  },
  {
    "nome": "Pão",
    "quantidade": "3",
    "categoria": "Padaria",
    "preco_medio": 4.00
  }
]
```

**Exemplo 2 (Objeto com items):**
```json
{
  "items": [
    {
      "nome": "Leite",
      "quantidade": "2",
      "categoria": "Laticínios"
    }
  ]
}
```

### ✅ **3. TEXTO SIMPLES (.txt)**
- Formato mais fácil
- Um item por linha
- Suporta quantidade inline

**Exemplo:**
```
Leite
2 Pães
Banana (1kg)
Detergente - 2
Café
Arroz
```

**Formatos de quantidade aceitos:**
- `2 Leites` (quantidade antes)
- `Leite (2)` (quantidade entre parênteses)
- `Leite - 2` (quantidade após hífen)
- `Leite` (assume quantidade 1)

---

## 🏷️ **CATEGORIAS AUTOMÁTICAS**

O sistema detecta automaticamente a categoria baseada no nome do item:

| Palavras-chave | Categoria |
|----------------|-----------|
| frutas, verduras, legumes | 🍎 Frutas e Verduras |
| carnes, frios, carne | 🥩 Carnes e Frios |
| laticínios, leite, queijo | 🥛 Laticínios |
| padaria, pão | 🍞 Padaria |
| mercearia | 🛒 Mercearia |
| limpeza | 🧹 Limpeza |
| higiene | 🧴 Higiene Pessoal |
| bebidas, bebida | 🥤 Bebidas |
| (outros) | 📦 Outros |

---

## 🚀 **COMO USAR**

### **Método 1: Importar Arquivo**

1. **Clique no botão 📥 Importar** no header
2. **Selecione o formato** (CSV, JSON ou Texto)
3. **Clique em "Selecionar Arquivo"**
4. **Escolha o arquivo** do seu computador
5. **Aguarde o processamento**
6. **Confirme a importação**

### **Método 2: Colar Texto**

1. **Clique no botão 📥 Importar** no header
2. **Selecione o formato** (CSV, JSON ou Texto)
3. **Cole o conteúdo** na área de texto
4. **Clique em "Importar Texto"**
5. **Confirme a importação**

---

## 📊 **CAMPOS SUPORTADOS**

### **Campos Obrigatórios:**
- ✅ **Nome** (nome, name, produto, item)

### **Campos Opcionais:**
- 📦 **Quantidade** (quantidade, quantity)
- 🏷️ **Categoria** (categoria, category)
- 💰 **Preço** (preco_medio, price, preco)
- ✅ **Comprado** (comprado, checked)
- 📈 **Frequência** (frequencia, frequency)
- 📅 **Última Compra** (ultima_compra, last_purchase)
- 📊 **Histórico de Preços** (historico_precos, price_history)
- ⏱️ **Dias Entre Compras** (dias_entre_compras, days_between_purchases)

---

## 🎯 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Lista Simples**
Copie e cole:
```
Leite
Pão
Arroz
Feijão
Café
```

### **Exemplo 2: Lista com Quantidades**
Copie e cole:
```
2 Leites
3 Pães
1kg Arroz
500g Café
2 Detergentes
```

### **Exemplo 3: CSV Completo**
Salve como `lista.csv`:
```csv
Nome,Quantidade,Categoria,Preço
Leite Integral,2L,Laticínios,5.50
Pão Francês,6un,Padaria,1.20
Arroz,5kg,Mercearia,25.90
Carne Moída,1kg,Carnes,28.00
Detergente,3un,Limpeza,3.50
Shampoo,1un,Higiene,12.90
Refrigerante,2L,Bebidas,6.50
```

### **Exemplo 4: JSON Estruturado**
Salve como `lista.json`:
```json
{
  "lista": "Supermercado Mensal",
  "data": "2025-10-12",
  "items": [
    {
      "nome": "Leite Integral",
      "quantidade": "2L",
      "categoria": "Laticínios",
      "preco_medio": 5.50,
      "frequencia": 8,
      "dias_entre_compras": 4
    },
    {
      "nome": "Pão Francês",
      "quantidade": "6un",
      "categoria": "Padaria",
      "preco_medio": 1.20,
      "frequencia": 15,
      "dias_entre_compras": 2
    }
  ]
}
```

---

## 🔄 **OPÇÕES DE IMPORTAÇÃO**

Ao importar, você pode escolher:

1. **➕ ADICIONAR** - Adiciona os itens à lista existente
2. **🔄 SUBSTITUIR** - Substitui toda a lista atual

---

## ✅ **VALIDAÇÃO AUTOMÁTICA**

O sistema valida:
- ✅ Formato do arquivo
- ✅ Estrutura dos dados
- ✅ Campos obrigatórios
- ✅ Valores válidos
- ✅ Categorias reconhecidas

**Relatório de importação mostra:**
- ✅ Itens importados com sucesso
- ❌ Erros encontrados (com detalhes)
- 👁️ Preview dos itens antes de confirmar

---

## 🌐 **IMPORTAR DE OUTRAS FONTES**

### **Google Sheets:**
1. Abra sua planilha no Google Sheets
2. Arquivo → Fazer download → CSV
3. Importe o arquivo CSV no app

### **Excel:**
1. Abra sua planilha no Excel
2. Arquivo → Salvar Como → CSV
3. Importe o arquivo CSV no app

### **Notas/Bloco de Notas:**
1. Liste os itens (um por linha)
2. Copie todo o conteúdo
3. Cole na área de texto do app

### **WhatsApp/Telegram:**
1. Copie a lista de mensagens
2. Cole na área de texto do app
3. Limpe se necessário

---

## 🛠️ **DICAS E TRUQUES**

### ✅ **Boas Práticas:**
1. Use cabeçalhos descritivos no CSV
2. Mantenha nomes de itens consistentes
3. Especifique unidades nas quantidades
4. Use categorias conhecidas
5. Inclua preços para orçamento

### ⚠️ **Evite:**
1. Linhas em branco no meio do arquivo
2. Caracteres especiais estranhos
3. Misturar formatos (escolha um)
4. Arquivos muito grandes (prefira dividir)

### 💡 **Dica Pro:**
- Exporte sua lista atual (CSV) como template
- Use-a como base para futuras importações
- Mantenha um arquivo mestre no Google Sheets

---

## 🐛 **RESOLUÇÃO DE PROBLEMAS**

### **Problema: "Formato não reconhecido"**
- **Solução:** Verifique se o arquivo está em um dos formatos suportados (CSV, JSON, TXT)

### **Problema: "Nenhum item importado"**
- **Solução:** Verifique se há dados válidos no arquivo (pelo menos um nome de item)

### **Problema: "Erros em várias linhas"**
- **Solução:** Veja o relatório de erros detalhado e corrija os itens problemáticos

### **Problema: "Categorias erradas"**
- **Solução:** Especifique a categoria explicitamente no CSV/JSON ou ajuste manualmente após importar

---

## 📱 **IMPORTAÇÃO MOBILE**

No celular, você pode:
1. Importar de arquivos na nuvem (Google Drive, Dropbox)
2. Importar de apps de notas
3. Copiar/colar de mensagens
4. Usar a câmera para escanear listas (futuro)

---

## 🎯 **CASOS DE USO**

### **1. Migração de Outro App**
Exporte sua lista do app antigo → Importe aqui

### **2. Lista Compartilhada da Família**
Mantenha lista no Google Sheets → Sincronize importando

### **3. Lista Recorrente**
Salve template → Importe mensalmente

### **4. Compra Planejada**
Crie lista no Excel com preços → Importe para controle de orçamento

---

## 🚀 **PRÓXIMOS PASSOS**

Após importar:
1. ✅ Revise os itens importados
2. 🏷️ Ajuste categorias se necessário
3. 💰 Adicione preços faltantes
4. 📊 Configure orçamento
5. 🔔 Ative notificações

---

## 💡 **EXEMPLO COMPLETO DE FLUXO**

**Cenário:** Importar lista do Google Sheets

1. **Google Sheets:**
   - Crie planilha com colunas: Nome, Quantidade, Categoria, Preço
   - Preencha os itens
   - Download como CSV

2. **App Lista de Compras:**
   - Clique em 📥 Importar
   - Selecione formato CSV
   - Escolha o arquivo baixado
   - Aguarde processamento
   - Revise preview
   - Confirme importação

3. **Pós-Importação:**
   - Configure orçamento
   - Ative lembretes
   - Comece a usar!

---

## 🎉 **SUCESSO!**

Agora você pode importar listas de qualquer lugar! 🚀

**Dúvidas?** Teste com os exemplos fornecidos acima!

---

## 📞 **SUPORTE**

Para mais informações sobre outras funcionalidades:
- 📱 PWA: Veja `FUNCIONALIDADES_IMPLEMENTADAS.md`
- 💾 Backup: Botão "Backup" no header
- 💰 Orçamento: Botão "Orçamento" no header
- 🔔 Notificações: Botão "Notificações" no header
- 👥 Compartilhar: Botão "Compartilhar" no header
- 📊 Relatórios: Botão "Relatórios" no header
