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
  /** Categoria atualmente ativa (para criar item nela). Fallback: OUTROS */
  currentCategory?: Category | string;
}

export interface ExecutorResult {
  success: boolean;
  message: string;
}

// ─── Normalização para busca fuzzy ───────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Busca item pelo nome (normalizado, partial match) */
function findItem(items: Item[], value: string): Item | undefined {
  const v = normalize(value);
  // Busca exata primeiro
  let found = items.find(i => normalize(i.nome) === v);
  if (!found) {
    // Busca por inclusão
    found = items.find(i => normalize(i.nome).includes(v) || v.includes(normalize(i.nome)));
  }
  return found;
}

/** Busca categoria pelo nome (fixa ou personalizada) */
function findCategory(
  value: string,
  customCategories: CustomCategory[],
): { type: 'fixed'; name: Category } | { type: 'custom'; cat: CustomCategory } | null {
  const v = normalize(value);

  // Categorias fixas
  for (const cat of Object.values(Category)) {
    if (normalize(cat) === v || normalize(cat).includes(v) || v.includes(normalize(cat))) {
      return { type: 'fixed', name: cat as Category };
    }
  }

  // Categorias personalizadas
  for (const cat of customCategories) {
    if (normalize(cat.name) === v || normalize(cat.name).includes(v) || v.includes(normalize(cat.name))) {
      return { type: 'custom', cat };
    }
  }

  return null;
}

// ─── Executor principal ───────────────────────────────────────────────────────

export function executeVoiceCommand(
  cmd: VoiceCommand,
  ctx: ExecutorContext,
): ExecutorResult {
  switch (cmd.action) {

    // ── Criar item ───────────────────────────────────────────────────────────
    case 'create_item': {
      const nome = cmd.value.trim();
      if (!nome) return { success: false, message: 'Nome do item não informado.' };

      // Capitalizar primeira letra para exibição
      const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);

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
      return { success: true, message: `✅ Item "${nomeFormatado}" adicionado.` };
    }

    // ── Remover item ─────────────────────────────────────────────────────────
    case 'remove_item': {
      const found = findItem(ctx.items, cmd.value);
      if (!found) {
        return { success: false, message: `❌ Item "${cmd.value}" não encontrado.` };
      }
      ctx.deleteItem(found.id);
      return { success: true, message: `🗑️ Item "${found.nome}" removido.` };
    }

    // ── Marcar como comprado ─────────────────────────────────────────────────
    case 'mark_purchased': {
      const found = findItem(ctx.items, cmd.value);
      if (!found) {
        return { success: false, message: `❌ Item "${cmd.value}" não encontrado.` };
      }
      if (found.comprado) {
        return { success: false, message: `ℹ️ "${found.nome}" já está marcado como comprado.` };
      }
      ctx.toggleItem(found.id);
      return { success: true, message: `✔️ "${found.nome}" marcado como comprado.` };
    }

    // ── Criar categoria ──────────────────────────────────────────────────────
    case 'create_category': {
      const nome = cmd.value.trim();
      if (!nome) return { success: false, message: 'Nome da categoria não informado.' };

      const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);

      // Verificar duplicata (fixas e personalizadas)
      const exists = findCategory(nome, ctx.customCategories);
      if (exists) {
        return { success: false, message: `ℹ️ Categoria "${nomeFormatado}" já existe.` };
      }

      const newCat: CustomCategory = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: nomeFormatado,
        icon: '🏷️',
        color: 'bg-mint',
      };

      ctx.addCustomCategory(newCat);
      return { success: true, message: `📁 Categoria "${nomeFormatado}" criada.` };
    }

    // ── Remover categoria ────────────────────────────────────────────────────
    case 'remove_category': {
      const found = findCategory(cmd.value, ctx.customCategories);

      if (!found) {
        return { success: false, message: `❌ Categoria "${cmd.value}" não encontrada.` };
      }

      if (found.type === 'fixed') {
        return {
          success: false,
          message: `⚠️ A categoria "${found.name}" é padrão e não pode ser removida por voz.`,
        };
      }

      // Categoria personalizada — remover e mover itens para Outros
      ctx.removeCustomCategory(found.cat.id, () => {/* handled in App */});
      return { success: true, message: `🗑️ Categoria "${found.cat.name}" removida.` };
    }

    // ── Desconhecido ─────────────────────────────────────────────────────────
    default:
      return {
        success: false,
        message: '❓ Comando não reconhecido. Tente: "adicionar arroz", "remover leite", "marcar pão como comprado".',
      };
  }
}
