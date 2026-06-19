// ─────────────────────────────────────────────────────────────────────────────
// voiceCommandParser.ts  —  Motor de Intenções (sem IA)
//
// Arquitetura em 2 etapas:
//   1. DETECTAR INTENÇÃO  — percorre padrões na ordem de prioridade
//   2. EXTRAIR ENTIDADE   — remove os marcadores e retorna o valor limpo
//
// PRIORIDADE OBRIGATÓRIA (mais específico → menos específico):
//   1. CREATE_CATEGORY   (palavra "categoria" → sempre ganha)
//   2. REMOVE_CATEGORY
//   3. MARK_PURCHASED
//   4. REMOVE_ITEM
//   5. CREATE_ITEM
// ─────────────────────────────────────────────────────────────────────────────

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type VoiceIntent =
  | 'CREATE_CATEGORY'
  | 'REMOVE_CATEGORY'
  | 'CREATE_ITEM'
  | 'REMOVE_ITEM'
  | 'MARK_PURCHASED'
  | 'OPEN_CATEGORY'
  | 'SHOW_LIST'
  | 'CLEAR_LIST'
  | 'EDIT_ITEM'
  | 'UNKNOWN';

/** Mantido para compatibilidade com voiceCommandExecutor.ts */
export type VoiceAction =
  | 'create_item'
  | 'remove_item'
  | 'create_category'
  | 'remove_category'
  | 'mark_purchased'
  | 'unknown';

export interface ParsedIntent {
  intent:   VoiceIntent;
  action:   VoiceAction;   // alias snake_case para o executor
  entity:   string;        // entidade extraída (nome do item / categoria)
  rawText:  string;        // texto original
}

/** Alias para compatibilidade com código existente */
export type VoiceCommand = ParsedIntent & { value: string };

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')      // pontuação → espaço
    .trim()
    .replace(/\s+/g, ' ');
}

// ─── Tabela central de padrões ────────────────────────────────────────────────
//
// Cada entrada define:
//   intent   : intenção que este padrão detecta
//   triggers : palavras-chave obrigatórias que precisam estar presentes
//   prefixes : prefixos que precedem a entidade (o que sobra é a entidade)
//   suffixes : sufixos opcionais a remover da entidade
//   requires : palavra que DEVE aparecer no texto para este padrão ser ativado
//   excludes : se qualquer dessas palavras estiver presente, este padrão é ignorado
//
// ORDEM DOS PADRÕES = PRIORIDADE DE MATCHING

interface IntentPattern {
  intent:    VoiceIntent;
  action:    VoiceAction;
  /** Pelo menos uma dessas strings deve estar no texto normalizado */
  triggers:  string[];
  /** Prefixos que precedem a entidade (remover para extrair entidade) */
  prefixes:  string[];
  /** Sufixos a remover da entidade */
  suffixes?: string[];
  /** Se definido, esta palavra DEVE estar presente */
  requires?: string;
  /** Se qualquer dessas palavras estiver presente, pular este padrão */
  excludes?: string[];
}

const commandPatterns: IntentPattern[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // PRIORIDADE 1 — CREATE_CATEGORY
  // Regra absoluta: qualquer frase com "categoria" + verbo de criação
  // ══════════════════════════════════════════════════════════════════════════
  {
    intent:   'CREATE_CATEGORY',
    action:   'create_category',
    requires: 'categoria',
    excludes: ['remover', 'excluir', 'apagar', 'deletar', 'delete'],
    triggers: ['criar', 'adicionar', 'nova', 'novo', 'crie', 'quero', 'cadastre', 'incluir', 'inserir', 'categoria'],
    prefixes: [
      'criar uma categoria ',
      'criar a categoria ',
      'criar categoria ',
      'crie uma categoria ',
      'crie a categoria ',
      'crie categoria ',
      'adicionar uma categoria ',
      'adicionar a categoria ',
      'adicionar categoria ',
      'nova categoria ',
      'novo categoria ',
      'quero uma categoria ',
      'quero a categoria ',
      'quero categoria ',
      'cadastre a categoria ',
      'cadastre uma categoria ',
      'cadastre categoria ',
      'incluir categoria ',
      'inserir categoria ',
      'nova ',           // "nova limpeza" com requires:categoria → não bate (sem a palavra)
      'categoria ',      // "categoria limpeza" direto
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRIORIDADE 2 — REMOVE_CATEGORY
  // ══════════════════════════════════════════════════════════════════════════
  {
    intent:   'REMOVE_CATEGORY',
    action:   'remove_category',
    requires: 'categoria',
    triggers: ['remover', 'excluir', 'apagar', 'deletar', 'delete'],
    prefixes: [
      'remover a categoria ',
      'remover categoria ',
      'excluir a categoria ',
      'excluir categoria ',
      'apagar a categoria ',
      'apagar categoria ',
      'deletar a categoria ',
      'deletar categoria ',
      'delete a categoria ',
      'delete categoria ',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRIORIDADE 3 — MARK_PURCHASED
  // ══════════════════════════════════════════════════════════════════════════
  {
    intent:   'MARK_PURCHASED',
    action:   'mark_purchased',
    excludes: ['categoria'],
    triggers: ['marcar', 'comprar', 'concluir', 'finalizar', 'comprado'],
    prefixes: [
      'marcar o item ',
      'marcar a item ',
      'marcar item ',
      'marcar o ',
      'marcar a ',
      'marcar ',
      'comprar o item ',
      'comprar item ',
      'comprar o ',
      'comprar a ',
      'comprar ',
      'concluir o item ',
      'concluir item ',
      'concluir o ',
      'concluir a ',
      'concluir ',
      'finalizar o item ',
      'finalizar item ',
      'finalizar o ',
      'finalizar a ',
      'finalizar ',
      'item ',           // "item arroz comprado"
    ],
    suffixes: [' como comprado', ' comprado', ' como comprada', ' comprada'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRIORIDADE 4 — REMOVE_ITEM
  // ══════════════════════════════════════════════════════════════════════════
  {
    intent:   'REMOVE_ITEM',
    action:   'remove_item',
    excludes: ['categoria'],
    triggers: ['remover', 'excluir', 'apagar', 'deletar', 'delete', 'tirar', 'retirar'],
    prefixes: [
      'remover o item ',
      'remover a item ',
      'remover item ',
      'remover o ',
      'remover a ',
      'remover ',
      'excluir o item ',
      'excluir item ',
      'excluir o ',
      'excluir ',
      'apagar o item ',
      'apagar item ',
      'apagar o ',
      'apagar ',
      'deletar o item ',
      'deletar item ',
      'deletar ',
      'tirar o item ',
      'tirar item ',
      'tirar o ',
      'tirar ',
      'retirar o item ',
      'retirar item ',
      'retirar ',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRIORIDADE 5 — CREATE_ITEM  (menos específico — último a ser testado)
  // ══════════════════════════════════════════════════════════════════════════
  {
    intent:   'CREATE_ITEM',
    action:   'create_item',
    excludes: ['categoria'],
    triggers: ['criar', 'adicionar', 'novo', 'nova', 'inserir', 'incluir', 'colocar', 'por', 'anotar'],
    prefixes: [
      'criar um item ',
      'criar uma item ',
      'criar o item ',
      'criar a item ',
      'criar item ',
      'criar um ',
      'criar uma ',
      'criar ',
      'adicionar um item ',
      'adicionar uma item ',
      'adicionar o item ',
      'adicionar a item ',
      'adicionar item ',
      'adicionar um ',
      'adicionar uma ',
      'adicionar ',
      'novo item ',
      'nova item ',
      'novo ',
      'nova ',
      'inserir item ',
      'inserir ',
      'incluir item ',
      'incluir ',
      'colocar item ',
      'colocar ',
      'por favor adicionar ',
      'anotar ',
      'anota ',
    ],
  },
];

// ─── Funções auxiliares ───────────────────────────────────────────────────────

/** Remove artigos e preposições do início da entidade extraída */
function cleanEntity(entity: string): string {
  return entity
    .replace(/^(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas)\s+/i, '')
    .trim();
}

/** Verifica se todas as excludes estão ausentes do texto */
function noExcludes(text: string, excludes?: string[]): boolean {
  if (!excludes || excludes.length === 0) return true;
  return excludes.every(ex => !text.includes(ex));
}

/** Verifica se pelo menos um trigger está no texto */
function hasTrigger(text: string, triggers: string[]): boolean {
  return triggers.some(t => text.includes(t));
}

// ─── Motor de intenções ───────────────────────────────────────────────────────

export function parseVoiceCommand(rawText: string): VoiceCommand {
  const normalized = normalize(rawText);

  // ── REGRA ABSOLUTA: presença de "categoria" sem verbo de remoção ──────────
  // Antes de qualquer outro teste, garantir que "criar categoria X" nunca
  // vire CREATE_ITEM
  const hasCategoria   = normalized.includes('categoria');
  const hasRemoveVerb  = /\b(remover|excluir|apagar|deletar|delete)\b/.test(normalized);

  // ── Percorrer padrões na ordem de prioridade ──────────────────────────────
  for (const pattern of commandPatterns) {

    // 1. Verificar requires (palavra obrigatória)
    if (pattern.requires && !normalized.includes(pattern.requires)) continue;

    // 2. Verificar excludes (palavras proibidas)
    if (!noExcludes(normalized, pattern.excludes)) continue;

    // 3. Para padrões de ITEM: se "categoria" está no texto, pular
    if (
      (pattern.intent === 'CREATE_ITEM' || pattern.intent === 'REMOVE_ITEM') &&
      hasCategoria
    ) continue;

    // 4. Verificar triggers (pelo menos um deve estar presente)
    if (!hasTrigger(normalized, pattern.triggers)) continue;

    // 5. Tentar extrair entidade pelos prefixos (do mais longo para o mais curto)
    const sortedPrefixes = [...pattern.prefixes].sort((a, b) => b.length - a.length);

    for (const prefix of sortedPrefixes) {
      const normalizedPrefix = normalize(prefix);
      if (!normalized.startsWith(normalizedPrefix)) continue;

      let entity = normalized.slice(normalizedPrefix.length).trim();

      // Remover sufixos conhecidos
      if (pattern.suffixes) {
        for (const suffix of pattern.suffixes) {
          const ns = normalize(suffix);
          if (entity.endsWith(ns)) {
            entity = entity.slice(0, entity.length - ns.length).trim();
            break;
          }
        }
      }

      entity = cleanEntity(entity);

      if (entity.length === 0) continue; // sem entidade → tentar próximo prefixo

      // ── Log de diagnóstico ────────────────────────────────────────────
      console.log(
        `[Voz] Texto: "${rawText}" | Intent: ${pattern.intent} | Entity: "${entity}" | Prefix: "${prefix}"`
      );

      return {
        intent:  pattern.intent,
        action:  pattern.action,
        entity,
        value:   entity,   // alias para compatibilidade
        rawText,
      };
    }
  }

  // ── UNKNOWN ───────────────────────────────────────────────────────────────
  console.log(`[Voz] Texto: "${rawText}" | Intent: UNKNOWN | Nenhum padrão correspondeu`);
  return {
    intent:  'UNKNOWN',
    action:  'unknown',
    entity:  '',
    value:   '',
    rawText,
  };
}

// ─── Descrição legível para o usuário ────────────────────────────────────────

export function describeCommand(cmd: VoiceCommand): string {
  switch (cmd.intent) {
    case 'CREATE_ITEM':      return `✅ Criar item: "${cmd.entity}"`;
    case 'REMOVE_ITEM':      return `🗑️ Remover item: "${cmd.entity}"`;
    case 'CREATE_CATEGORY':  return `📁 Criar categoria: "${cmd.entity}"`;
    case 'REMOVE_CATEGORY':  return `🗑️ Remover categoria: "${cmd.entity}"`;
    case 'MARK_PURCHASED':   return `✔️ Marcar como comprado: "${cmd.entity}"`;
    default:
      return '❓ Comando não reconhecido. Tente: "adicionar arroz", "criar categoria limpeza", "marcar pão como comprado".';
  }
}
