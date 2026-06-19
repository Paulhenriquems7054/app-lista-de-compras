// ─────────────────────────────────────────────────────────────────────────────
// voiceCommandParser.ts
// Interpreta texto de voz em comandos estruturados usando regras pré-definidas.
// Zero IA, zero APIs externas.
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceAction =
  | 'create_item'
  | 'remove_item'
  | 'create_category'
  | 'remove_category'
  | 'mark_purchased'
  | 'unknown';

export interface VoiceCommand {
  action: VoiceAction;
  value: string;         // nome do item ou categoria extraído
  rawText: string;       // texto original para exibição
}

// ─── Regras de parsing (ordem importa: mais específicas primeiro) ─────────────

interface Rule {
  action: VoiceAction;
  // Padrões: array de prefixos que o texto normalizado pode ter.
  // O valor é tudo que vem depois do prefixo.
  prefixes: string[];
  // Alguns comandos têm sufixo obrigatório (ex: "como comprado")
  suffix?: string;
}

const RULES: Rule[] = [
  // ── Marcar como comprado ────────────────────────────────────────────────
  // "marcar arroz como comprado" | "item arroz comprado" | "comprar arroz" | "concluir arroz"
  {
    action: 'mark_purchased',
    prefixes: [
      'marcar item ', 'marcar o item ', 'marcar a item ',
      'marcar ', 'item ',
      'concluir item ', 'concluir o item ', 'concluir a ',
      'concluir ',
      'comprar item ', 'comprar o item ', 'comprar ',
    ],
    suffix: ' como comprado',
  },
  {
    action: 'mark_purchased',
    prefixes: ['item '],
    suffix: ' comprado',
  },

  // ── Remover item ────────────────────────────────────────────────────────
  {
    action: 'remove_item',
    prefixes: [
      'remover item ', 'remover o item ', 'remover a item ',
      'excluir item ', 'excluir o item ',
      'apagar item ',  'apagar o item ',
      'deletar item ', 'deletar o item ',
      'remover ', 'excluir ', 'apagar ', 'deletar ',
    ],
  },

  // ── Criar item ──────────────────────────────────────────────────────────
  {
    action: 'create_item',
    prefixes: [
      'criar item ',   'criar o item ',  'criar a item ',
      'adicionar item ','adicionar o item ', 'adicionar a item ',
      'novo item ',    'nova item ',
      'inserir item ', 'incluir item ',
      'criar ',        'adicionar ',     'novo ',          'nova ',
    ],
  },

  // ── Remover categoria ───────────────────────────────────────────────────
  {
    action: 'remove_category',
    prefixes: [
      'remover categoria ',   'remover a categoria ',
      'excluir categoria ',   'excluir a categoria ',
      'apagar categoria ',    'apagar a categoria ',
      'deletar categoria ',   'deletar a categoria ',
    ],
  },

  // ── Criar categoria ─────────────────────────────────────────────────────
  {
    action: 'create_category',
    prefixes: [
      'criar categoria ',    'criar a categoria ',
      'adicionar categoria ', 'adicionar a categoria ',
      'nova categoria ',     'novo categoria ',
    ],
  },
];

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')     // remove pontuação
    .trim()
    .replace(/\s+/g, ' ');           // colapsa espaços
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseVoiceCommand(rawText: string): VoiceCommand {
  const normalized = normalize(rawText);

  for (const rule of RULES) {
    for (const prefix of rule.prefixes) {
      const normalizedPrefix = normalize(prefix);

      if (!normalized.startsWith(normalizedPrefix)) continue;

      let value = normalized.slice(normalizedPrefix.length).trim();

      // Se tem sufixo obrigatório, verificar e remover
      if (rule.suffix) {
        const normalizedSuffix = normalize(rule.suffix);
        if (value.endsWith(normalizedSuffix)) {
          value = value.slice(0, value.length - normalizedSuffix.length).trim();
        } else if (rule.action === 'mark_purchased') {
          // Para mark_purchased com prefixos sem sufixo (ex: "comprar arroz"),
          // aceitar sem sufixo também
          if (
            normalizedPrefix.startsWith('comprar') ||
            normalizedPrefix.startsWith('concluir')
          ) {
            // ok, sem sufixo
          } else {
            continue; // sufixo obrigatório ausente — tentar próxima regra
          }
        }
      }

      if (value.length === 0) continue; // precisa de valor

      return { action: rule.action, value, rawText };
    }
  }

  return { action: 'unknown', value: '', rawText };
}

// ─── Formata o resultado para exibição ao usuário ────────────────────────────

export function describeCommand(cmd: VoiceCommand): string {
  switch (cmd.action) {
    case 'create_item':      return `✅ Criar item: "${cmd.value}"`;
    case 'remove_item':      return `🗑️ Remover item: "${cmd.value}"`;
    case 'create_category':  return `📁 Criar categoria: "${cmd.value}"`;
    case 'remove_category':  return `🗑️ Remover categoria: "${cmd.value}"`;
    case 'mark_purchased':   return `✔️ Marcar como comprado: "${cmd.value}"`;
    default:                 return '❓ Comando não reconhecido. Tente novamente.';
  }
}
