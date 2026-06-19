// ─────────────────────────────────────────────────────────────────────────────
// voiceCommandExecutor.ts
// Executa ações reais no estado do app baseadas no VoiceCommand parseado.
// ─────────────────────────────────────────────────────────────────────────────

import { VoiceCommand } from './voiceCommandParser';
import { Item, Category, CustomCategory } from '../types';

export interface ExecutorContext {
  items: Item[];
  customCategories: CustomCategory[];
  addItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  toggleItem: (id: string) => void;
  addCustomCategory: (cat: CustomCategory) => void;
  removeCustomCategory: (id: string, moveItemsToOthers: () => void) => void;
  /** Categoria ativa no momento (para criar item nela). Fallback: OUTROS */
  currentCategory?: Category | string;
}

export interface ExecutorResult {
  success: boolean;
  message: string;
}

// ─── Normalização fuzzy ───────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Busca item pelo nome — exato primeiro, depois por inclusão */
function findItem(items: Item[], entity: string): Item | undefined {
  const v = normalize(entity);
  return (
    items.find(i => normalize(i.nome) === v) ??
    items.find(i => normalize(i.nome).includes(v) || v.includes(normalize(i.nome)))
  );
}

/** Busca categoria fixa ou personalizada pelo nome */
function findCategory(
  entity: string,
  customCategories: CustomCategory[],
): { type: 'fixed'; name: Category } | { type: 'custom'; cat: CustomCategory } | null {
  const v = normalize(entity);

  for (const cat of Object.values(Category)) {
    const nc = normalize(cat);
    if (nc === v || nc.includes(v) || v.includes(nc)) {
      return { type: 'fixed', name: cat as Category };
    }
  }

  for (const cat of customCategories) {
    const nc = normalize(cat.name);
    if (nc === v || nc.includes(v) || v.includes(nc)) {
      return { type: 'custom', cat };
    }
  }

  return null;
}

/** Log de diagnóstico com ação executada */
function logAction(cmd: VoiceCommand, action: string): void {
  console.log(
    `[Voz] Texto: "${cmd.rawText}" | Intent: ${cmd.intent} | Entity: "${cmd.entity}" | Action: ${action}`
  );
}

// ─── Executor principal ───────────────────────────────────────────────────────

export function executeVoiceCommand(
  cmd: VoiceCommand,
  ctx: ExecutorContext,
): ExecutorResult {

  // entity e value são aliases — usar entity como fonte primária
  const entity = (cmd.entity || cmd.value || '').trim();

  switch (cmd.action) {

    // ── Criar item ────────────────────────────────────────────────────────────
    case 'create_item': {
      if (!entity) {
        logAction(cmd, 'Erro: entidade vazia');
        return { success: false, message: 'Nome do item não informado.' };
      }

      const nomeFormatado = entity.charAt(0).toUpperCase() + entity.slice(1);

      const newItem: Item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nome: nomeFormatado,
        quantidade: '1',
        categoria: (ctx.currentCategory as Category) ?? Category.OUTROS,
        comprado: false,
        frequencia: 1,
        ultima_compra: new Date().toISOString(),
      };

      ctx.addItem(newItem);
      logAction(cmd, `Item criado: "${nomeFormatado}"`);
      return { success: true, message: `✅ Item "${nomeFormatado}" adicionado.` };
    }

    // ── Remover item ──────────────────────────────────────────────────────────
    case 'remove_item': {
      const found = findItem(ctx.items, entity);
      if (!found) {
        logAction(cmd, `Erro: item "${entity}" não encontrado`);
        return { success: false, message: `❌ Item "${entity}" não encontrado.` };
      }
      ctx.deleteItem(found.id);
      logAction(cmd, `Item removido: "${found.nome}"`);
      return { success: true, message: `🗑️ Item "${found.nome}" removido.` };
    }

    // ── Marcar como comprado ──────────────────────────────────────────────────
    case 'mark_purchased': {
      const found = findItem(ctx.items, entity);
      if (!found) {
        logAction(cmd, `Erro: item "${entity}" não encontrado`);
        return { success: false, message: `❌ Item "${entity}" não encontrado.` };
      }
      if (found.comprado) {
        logAction(cmd, `Info: "${found.nome}" já estava comprado`);
        return { success: false, message: `ℹ️ "${found.nome}" já está marcado como comprado.` };
      }
      ctx.toggleItem(found.id);
      logAction(cmd, `Item marcado como comprado: "${found.nome}"`);
      return { success: true, message: `✔️ "${found.nome}" marcado como comprado.` };
    }

    // ── Criar categoria ───────────────────────────────────────────────────────
    case 'create_category': {
      if (!entity) {
        logAction(cmd, 'Erro: entidade vazia');
        return { success: false, message: 'Nome da categoria não informado.' };
      }

      const nomeFormatado = entity.charAt(0).toUpperCase() + entity.slice(1);

      const exists = findCategory(entity, ctx.customCategories);
      if (exists) {
        const existingName = exists.type === 'fixed' ? exists.name : exists.cat.name;
        logAction(cmd, `Info: categoria "${existingName}" já existe`);
        return { success: false, message: `ℹ️ Categoria "${existingName}" já existe.` };
      }

      const newCat: CustomCategory = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: nomeFormatado,
        icon: '🏷️',
        color: 'bg-mint',
      };

      ctx.addCustomCategory(newCat);
      logAction(cmd, `Categoria criada: "${nomeFormatado}"`);
      return { success: true, message: `📁 Categoria "${nomeFormatado}" criada.` };
    }

    // ── Remover categoria ─────────────────────────────────────────────────────
    case 'remove_category': {
      const found = findCategory(entity, ctx.customCategories);

      if (!found) {
        logAction(cmd, `Erro: categoria "${entity}" não encontrada`);
        return { success: false, message: `❌ Categoria "${entity}" não encontrada.` };
      }

      if (found.type === 'fixed') {
        logAction(cmd, `Erro: tentativa de remover categoria padrão "${found.name}"`);
        return {
          success: false,
          message: `⚠️ "${found.name}" é uma categoria padrão e não pode ser removida.`,
        };
      }

      ctx.removeCustomCategory(found.cat.id, () => { /* itens movidos para Outros no App */ });
      logAction(cmd, `Categoria removida: "${found.cat.name}"`);
      return { success: true, message: `🗑️ Categoria "${found.cat.name}" removida.` };
    }

    // ── Desconhecido ──────────────────────────────────────────────────────────
    default:
      logAction(cmd, 'Ação desconhecida');
      return {
        success: false,
        message: '❓ Comando não reconhecido. Tente: "adicionar arroz", "criar categoria limpeza", "marcar pão como comprado".',
      };
  }
}
