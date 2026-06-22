# 💑 Guia de Vínculo de Casal — Lista de Compras Compartilhada

## Visão Geral

O app suporta dois modos de uso em casal:

| Modo | Como funciona | Indicado para |
|---|---|---|
| **Conta compartilhada** | Os dois usam o mesmo e-mail e senha | Uso imediato, sem configuração |
| **Contas separadas vinculadas** | Cada um tem sua conta, vinculadas pelo app | Uso ideal — identidade própria + sincronização Realtime |

Este guia descreve o modo **contas separadas vinculadas**.

---

## Pré-requisitos

- Ambos precisam ter acesso ao app no celular
- Conexão com internet em ambos os aparelhos
- Cada um precisa criar sua própria conta

---

## Passo a Passo

### Etapa 1 — Pessoa A cria sua conta

1. Abra o app
2. Toque em **"Criar conta"**
3. Preencha:
   - **E-mail:** seu e-mail pessoal (ex: `ana@gmail.com`)
   - **Senha:** mínimo 6 caracteres
   - **Nome do casal:** como vocês querem ser identificados (ex: `Ana e João`)
4. Toque em **"Criar conta"**

---

### Etapa 2 — Pessoa B cria sua conta

1. No outro celular, abra o app
2. Toque em **"Criar conta"**
3. Preencha:
   - **E-mail:** e-mail diferente do parceiro (ex: `joao@gmail.com`)
   - **Senha:** sua senha pessoal
   - **Nome do casal:** mesmo nome ou diferente — fica a gosto
4. Toque em **"Criar conta"**

> ⚠️ Cada pessoa precisa usar um e-mail diferente. Dois e-mails, duas contas.

---

### Etapa 3 — Vincular as contas (feito por apenas um dos dois)

Apenas **uma pessoa** precisa fazer este passo. Pode ser qualquer um dos dois.

1. Abra o **Menu** (botão ☰ no canto superior esquerdo)
2. Role até a seção **Configurações**
3. Toque em **💑 Vínculo de Casal**
4. Na tela que abrir, digite o **e-mail do(a) parceiro(a)**
   - Ex: se você é Ana, digite `joao@gmail.com`
5. Toque em **"Vincular casal"**
6. Uma mensagem de confirmação aparecerá: ✅ *Casal vinculado com sucesso!*

---

### Etapa 4 — Verificar o vínculo

Após vincular:

- A tela de **Vínculo de Casal** mostrará o nome e e-mail do parceiro com um indicador verde 💚
- No cabeçalho do app, o indicador **sync** ficará verde com um ponto pulsante

---

### Etapa 5 — Testar a sincronização

1. **Pessoa A** adiciona um item (ex: "Leite")
2. **Pessoa B** verá "Leite" aparecer automaticamente na lista, sem atualizar a página
3. **Pessoa B** marca o item como comprado
4. **Pessoa A** verá a mudança em tempo real

---

## Como funciona internamente

```
Pessoa A adiciona item
       ↓
   Supabase (INSERT)
       ↓
  Realtime Channel
       ↓
Pessoa B recebe atualização instantânea
```

O vínculo funciona através de um `couple_id` — um UUID compartilhado entre os dois perfis. As políticas de segurança do banco (RLS) garantem que cada casal só veja seus próprios dados.

---

## Desvincular o casal

Se quiserem separar as listas novamente:

1. Abra o **Menu** → **Configurações** → **💑 Vínculo de Casal**
2. Toque em **"🔓 Desvincular casal"**
3. Confirme na caixa de diálogo
4. As listas voltam a ser independentes imediatamente

> ⚠️ Após desvincular, cada um continuará com os itens que estavam na lista compartilhada no momento da desvinculação. Os dados não são apagados.

---

## Perguntas Frequentes

**Preciso refazer o vínculo quando troco de celular?**
Não. O vínculo fica salvo no banco de dados. Basta fazer login na nova conta no novo aparelho.

**Os dois podem adicionar itens ao mesmo tempo?**
Sim. O app usa atualizações otimistas — cada ação aparece imediatamente na tela de quem fez, e o Realtime sincroniza para o outro em milissegundos.

**O que acontece se um dos dois ficar sem internet?**
O app continua funcionando offline usando o cache local. Quando a conexão voltar, os dados são sincronizados automaticamente na próxima abertura do app.

**Posso vincular mais de uma pessoa?**
Não. O sistema suporta exatamente dois usuários por casal. Se tentar vincular uma terceira pessoa, o sistema impedirá.

**O parceiro precisa aceitar o convite?**
Não há um fluxo de aceitação — o vínculo é feito diretamente. Combine com seu parceiro antes de vincular.

---

## Indicadores Visuais no App

| Indicador | Significado |
|---|---|
| 🟢 **sync** (piscando no header) | Conectado ao Supabase, dados sincronizados |
| ⚫ **offline** (header) | Sem conexão, usando cache local |
| 💚 Card verde na tela de vínculo | Casal vinculado com parceiro identificado |
| 💑 Ícone no menu | Acesso rápido à tela de vínculo |
