// ─────────────────────────────────────────────────────────────────────────────
// voiceCommandParser.ts  —  Motor de Intenções v2 (sem IA)
//
// Estrutura de saída:
//   { action, product, quantity, unit, category, entity, rawText }
//
// PIPELINE:
//   1. Normalizar texto (minúsculas, sem acentos para comparação)
//   2. Detectar intenção por prioridade (categoria > item)
//   3. Extrair quantidade + unidade
//   4. Extrair nome do produto (após remover ação, quantidade, unidade)
//   5. Categorizar produto automaticamente via catálogo
//   6. Retornar ParsedCommand estruturado
// ─────────────────────────────────────────────────────────────────────────────

import { Category } from '../types';
import { categorizeProduct } from './voiceProductCatalog';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type VoiceIntent =
  | 'ADD_OR_UPDATE_ITEM'   // criar item novo ou atualizar existente
  | 'REMOVE_ITEM'
  | 'MARK_PURCHASED'
  | 'CREATE_CATEGORY'
  | 'REMOVE_CATEGORY'
  | 'UNKNOWN';

/** Mantido para compatibilidade com o executor */
export type VoiceAction =
  | 'add_or_update_item'
  | 'remove_item'
  | 'mark_purchased'
  | 'create_category'
  | 'remove_category'
  | 'unknown';

export interface ParsedCommand {
  intent:    VoiceIntent;
  action:    VoiceAction;
  product:   string | null;    // nome do produto (versão original, capitalizada)
  quantity:  number | null;    // quantidade numérica extraída
  unit:      string | null;    // unidade normalizada (kg, l, un, etc.)
  category:  Category | null;  // categoria detectada pelo catálogo
  entity:    string;           // texto da entidade principal (compatibilidade)
  value:     string;           // alias de entity (compatibilidade)
  rawText:   string;           // texto original reconhecido
}

/** Alias para compatibilidade com VoiceCommandButton */
export type VoiceCommand = ParsedCommand;

// ─── Normalização ─────────────────────────────────────────────────────────────

/** Normaliza para comparação: minúsculas, sem acentos, sem pontuação */
function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.,]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Capitaliza primeira letra, mantém o restante como está */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Dicionário de unidades ───────────────────────────────────────────────────

interface UnitEntry {
  aliases: string[];  // palavras que o usuário pode falar
  normalized: string; // forma canônica armazenada
}

const UNITS: UnitEntry[] = [
  { aliases: ['quilograma', 'quilogramas', 'quilo', 'quilos', 'kg', 'kilo', 'kilos'], normalized: 'kg' },
  { aliases: ['grama', 'gramas', 'g'], normalized: 'g' },
  { aliases: ['miligrama', 'miligramas', 'mg'], normalized: 'mg' },
  { aliases: ['litro', 'litros', 'l'], normalized: 'l' },
  { aliases: ['mililitro', 'mililitros', 'ml'], normalized: 'ml' },
  { aliases: ['unidade', 'unidades', 'un', 'und', 'uni'], normalized: 'un' },
  { aliases: ['pacote', 'pacotes'], normalized: 'pacote' },
  { aliases: ['caixa', 'caixas'], normalized: 'caixa' },
  { aliases: ['lata', 'latas'], normalized: 'lata' },
  { aliases: ['garrafa', 'garrafas'], normalized: 'garrafa' },
  { aliases: ['bandeja', 'bandejas'], normalized: 'bandeja' },
  { aliases: ['saco', 'sacos'], normalized: 'saco' },
  { aliases: ['dúzia', 'duzia', 'duzias'], normalized: 'dúzia' },
  { aliases: ['fatia', 'fatias'], normalized: 'fatia' },
  { aliases: ['pote', 'potes'], normalized: 'pote' },
  { aliases: ['frasco', 'frascos'], normalized: 'frasco' },
  { aliases: ['tablete', 'tabletes'], normalized: 'tablete' },
  { aliases: ['pedaço', 'pedaco', 'pedacos', 'pedaços'], normalized: 'pedaço' },
];

// Índice invertido alias → unidade canônica (construído na carga)
const UNIT_INDEX = new Map<string, string>();
for (const entry of UNITS) {
  for (const alias of entry.aliases) {
    UNIT_INDEX.set(alias, entry.normalized);
  }
}

// ─── Extração de quantidade + unidade ────────────────────────────────────────

interface QuantityResult {
  quantity: number | null;
  unit: string | null;
  /** Posição de início no texto normalizado */
  start: number;
  /** Posição de fim no texto normalizado */
  end: number;
}

/**
 * Encontra o primeiro padrão "número [unidade]" no texto normalizado.
 * Suporta: "5", "5,5", "0.5", "meia" → 0.5, "um" → 1, "uma" → 1
 *
 * Exemplos:
 *   "comprar 5 quilos de acucar" → { quantity: 5, unit: "kg", ... }
 *   "adicionar 1,5 litro de leite" → { quantity: 1.5, unit: "l", ... }
 *   "comprar meio litro de oleo" → { quantity: 0.5, unit: "l", ... }
 */
function extractQuantity(text: string): QuantityResult | null {
  // Palavras numéricas por extenso
  const wordNumbers: Record<string, number> = {
    'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3,
    'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
    'dez': 10, 'doze': 12, 'quinze': 15, 'vinte': 20, 'trinta': 30,
    'meia': 0.5, 'meio': 0.5,
  };

  const tokens = text.split(' ');

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Tentar parsear como número (ex: "5", "1,5", "0.5")
    const numericStr = token.replace(',', '.');
    let qty = parseFloat(numericStr);

    // Tentar número por extenso
    if (isNaN(qty) && wordNumbers[token] !== undefined) {
      qty = wordNumbers[token];
    }

    if (isNaN(qty) || qty < 0) continue;

    // Calcular posição no texto original
    const start = tokens.slice(0, i).join(' ').length + (i > 0 ? 1 : 0);

    // Verificar se o próximo token é uma unidade
    const nextToken = tokens[i + 1] ?? '';
    const unitCanon = UNIT_INDEX.get(nextToken);

    const end = unitCanon
      ? start + token.length + 1 + nextToken.length
      : start + token.length;

    return {
      quantity: qty,
      unit: unitCanon ?? null,
      start,
      end,
    };
  }

  return null;
}

// ─── Verbos de ação e seus padrões ───────────────────────────────────────────

const ACTION_PREFIXES: Record<string, VoiceIntent> = {
  // ADD_OR_UPDATE_ITEM
  'adicionar ':       'ADD_OR_UPDATE_ITEM',
  'comprar ':         'ADD_OR_UPDATE_ITEM',
  'preciso de ':      'ADD_OR_UPDATE_ITEM',
  'preciso do ':      'ADD_OR_UPDATE_ITEM',
  'preciso da ':      'ADD_OR_UPDATE_ITEM',
  'quero ':           'ADD_OR_UPDATE_ITEM',
  'anotar ':          'ADD_OR_UPDATE_ITEM',
  'anota ':           'ADD_OR_UPDATE_ITEM',
  'botar ':           'ADD_OR_UPDATE_ITEM',
  'colocar ':         'ADD_OR_UPDATE_ITEM',
  'inserir ':         'ADD_OR_UPDATE_ITEM',
  'incluir ':         'ADD_OR_UPDATE_ITEM',
  'criar item ':      'ADD_OR_UPDATE_ITEM',
  'criar ':           'ADD_OR_UPDATE_ITEM',
  'novo item ':       'ADD_OR_UPDATE_ITEM',
  'nova ':            'ADD_OR_UPDATE_ITEM',
  'novo ':            'ADD_OR_UPDATE_ITEM',
  // "marcar" e "concluir" — podem virar ADD_OR_UPDATE_ITEM se houver quantidade
  'marcar ':          'MARK_PURCHASED',
  'concluir ':        'MARK_PURCHASED',
  'finalizar ':       'MARK_PURCHASED',
  // REMOVE_ITEM
  'remover ':         'REMOVE_ITEM',
  'excluir ':         'REMOVE_ITEM',
  'apagar ':          'REMOVE_ITEM',
  'deletar ':         'REMOVE_ITEM',
  'tirar ':           'REMOVE_ITEM',
  'retirar ':         'REMOVE_ITEM',
};

// Prefixos de categoria (verificados ANTES dos prefixos de item)
const CATEGORY_ADD_PREFIXES = [
  'criar categoria ', 'criar a categoria ', 'criar uma categoria ',
  'nova categoria ', 'novo categoria ',
  'adicionar categoria ', 'adicionar a categoria ',
  'crie categoria ', 'crie a categoria ',
  'cadastrar categoria ', 'cadastre categoria ',
  'incluir categoria ', 'inserir categoria ',
  'quero categoria ', 'quero a categoria ', 'quero uma categoria ',
  'categoria ',
];

const CATEGORY_REMOVE_PREFIXES = [
  'remover categoria ', 'remover a categoria ',
  'excluir categoria ', 'excluir a categoria ',
  'apagar categoria ',  'apagar a categoria ',
  'deletar categoria ', 'deletar a categoria ',
  'delete categoria ',
];

// Sufixos a remover do produto ao processar MARK_PURCHASED
const PURCHASED_SUFFIXES = [' como comprado', ' comprado', ' como comprada', ' comprada'];

// ─── Artigos e preposições a remover do início do produto ─────────────────────

const LEADING_STOPWORDS = /^(o |a |os |as |um |uma |de |do |da |dos |das |em |no |na |nos |nas )+/;

function cleanProduct(s: string): string {
  return s.replace(LEADING_STOPWORDS, '').trim();
}

// ─── Funções de detecção de intenção ─────────────────────────────────────────

function detectCategoryIntent(text: string): { intent: 'CREATE_CATEGORY' | 'REMOVE_CATEGORY'; entity: string } | null {
  // Verificar se a palavra "categoria" está presente (regra absoluta)
  if (!text.includes('categoria')) return null;

  // Tentar remover categoria
  for (const prefix of CATEGORY_REMOVE_PREFIXES.sort((a, b) => b.length - a.length)) {
    if (text.startsWith(norm(prefix))) {
      const entity = cleanProduct(text.slice(norm(prefix).length).trim());
      if (entity.length > 0) return { intent: 'REMOVE_CATEGORY', entity };
    }
  }

  // Tentar criar categoria
  for (const prefix of CATEGORY_ADD_PREFIXES.sort((a, b) => b.length - a.length)) {
    if (text.startsWith(norm(prefix))) {
      const entity = cleanProduct(text.slice(norm(prefix).length).trim());
      if (entity.length > 0) return { intent: 'CREATE_CATEGORY', entity };
    }
  }

  return null;
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseVoiceCommand(rawText: string): ParsedCommand {
  const normalized = norm(rawText);

  // ── FASE 1: Detectar intenção de CATEGORIA (prioridade máxima) ────────────
  const categoryResult = detectCategoryIntent(normalized);
  if (categoryResult) {
    const { intent, entity } = categoryResult;
    const action: VoiceAction = intent === 'CREATE_CATEGORY' ? 'create_category' : 'remove_category';

    console.log(`[VOICE] Texto: ${rawText} | Action: ${action} | Product: ${entity} | Category: null`);

    return {
      intent, action,
      product: capitalize(entity),
      quantity: null, unit: null, category: null,
      entity: capitalize(entity),
      value: capitalize(entity),
      rawText,
    };
  }

  // ── FASE 2: Detectar ação de ITEM pelo prefixo ────────────────────────────
  let detectedIntent: VoiceIntent = 'UNKNOWN';
  let remainingText = normalized;

  // Ordenar prefixos do mais longo para o mais curto (evita match parcial)
  const sortedPrefixes = Object.entries(ACTION_PREFIXES)
    .sort(([a], [b]) => b.length - a.length);

  for (const [prefix, intent] of sortedPrefixes) {
    if (normalized.startsWith(norm(prefix))) {
      detectedIntent = intent;
      remainingText  = normalized.slice(norm(prefix).length).trim();
      break;
    }
  }

  if (detectedIntent === 'UNKNOWN') {
    console.log(
      `[VOICE PARSER]\n` +
      `  Texto:      ${rawText}\n` +
      `  Normalizado:${normalized}\n` +
      `  Action:     unknown\n` +
      `  Status:     FAILED — nenhum prefixo de ação reconhecido`
    );
    return {
      intent: 'UNKNOWN', action: 'unknown',
      product: null, quantity: null, unit: null, category: null,
      entity: '', value: '', rawText,
    };
  }

  // ── FASE 3: Extrair quantidade + unidade ──────────────────────────────────
  const quantResult = extractQuantity(remainingText);
  let productText = remainingText;

  if (quantResult) {
    // Remover "5 quilos" ou "5" do texto para isolar o produto
    productText = (
      remainingText.slice(0, quantResult.start) +
      ' ' +
      remainingText.slice(quantResult.end)
    ).trim();

    // REGRA: se o usuário informou quantidade, a intenção é sempre
    // adicionar/atualizar o item — nunca apenas marcar como comprado.
    // Ex: "marcar 5 kg de açúcar" → ADD_OR_UPDATE_ITEM (não MARK_PURCHASED)
    if (detectedIntent === 'MARK_PURCHASED') {
      console.log(`[VOICE PARSER] Quantidade detectada com MARK_PURCHASED — promovendo para ADD_OR_UPDATE_ITEM`);
      detectedIntent = 'ADD_OR_UPDATE_ITEM';
    }
  }

  // ── FASE 4: Remover sufixos de "como comprado" ────────────────────────────
  if (detectedIntent === 'MARK_PURCHASED') {
    for (const suffix of PURCHASED_SUFFIXES) {
      const ns = norm(suffix);
      if (productText.endsWith(ns)) {
        productText = productText.slice(0, productText.length - ns.length).trim();
        break;
      }
    }
  }

  // ── FASE 5: Limpar produto (remover artigos/preposições) ──────────────────
  productText = cleanProduct(productText).replace(/^de\s+/, '').trim();

  if (productText.length === 0) {
    console.log(`[VOICE] Texto: ${rawText} | Action: ${detectedIntent} | Produto vazio após extração`);
    return {
      intent: 'UNKNOWN', action: 'unknown',
      product: null, quantity: null, unit: null, category: null,
      entity: '', value: '', rawText,
    };
  }

  // ── FASE 6: Categorizar produto automaticamente ───────────────────────────
  const category = categorizeProduct(productText);

  // ── FASE 7: Montar quantidade como string legível ─────────────────────────
  let quantityDisplay: string | null = null;
  if (quantResult) {
    const q = quantResult.quantity!;
    const u = quantResult.unit ?? 'un';
    quantityDisplay = `${q} ${u}`;
  }

  const productDisplay = capitalize(productText);
  const action: VoiceAction =
    detectedIntent === 'ADD_OR_UPDATE_ITEM' ? 'add_or_update_item' :
    detectedIntent === 'REMOVE_ITEM'        ? 'remove_item'        :
    detectedIntent === 'MARK_PURCHASED'     ? 'mark_purchased'     : 'unknown';

  console.log(
    `[VOICE PARSER]\n` +
    `  Texto:      ${rawText}\n` +
    `  Normalizado:${normalized}\n` +
    `  Action:     ${action}\n` +
    `  Product:    ${productDisplay}\n` +
    `  Quantity:   ${quantResult?.quantity ?? 'null'}\n` +
    `  Unit:       ${quantResult?.unit ?? 'null'}\n` +
    `  Category:   ${category}\n` +
    `  Status:     SUCCESS`
  );

  return {
    intent: detectedIntent,
    action,
    product: productDisplay,
    quantity: quantResult?.quantity ?? null,
    unit: quantResult?.unit ?? null,
    category,
    entity: productDisplay,
    value: productDisplay,
    rawText,
  };
}

// ─── Descrição legível para o usuário ────────────────────────────────────────

export function describeCommand(cmd: ParsedCommand): string {
  switch (cmd.intent) {
    case 'ADD_OR_UPDATE_ITEM': {
      const qty = cmd.quantity ? `${cmd.quantity} ${cmd.unit ?? 'un'}` : null;
      return `✅ ${cmd.product}${qty ? ` — ${qty}` : ''}${cmd.category ? ` (${cmd.category})` : ''}`;
    }
    case 'REMOVE_ITEM':      return `🗑️ Remover: "${cmd.product}"`;
    case 'MARK_PURCHASED':   return `✔️ Comprado: "${cmd.product}"`;
    case 'CREATE_CATEGORY':  return `📁 Nova categoria: "${cmd.entity}"`;
    case 'REMOVE_CATEGORY':  return `🗑️ Remover categoria: "${cmd.entity}"`;
    default:
      return '❓ Comando não reconhecido. Tente: "comprar 5 quilos de arroz", "adicionar leite", "criar categoria pet".';
  }
}
