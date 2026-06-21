// ─────────────────────────────────────────────────────────────────────────────
// voiceCommandExecutor.ts  v2
// Executa ações reais no estado do app com:
//   - Anti-duplicidade (busca item existente antes de criar)
//   - Atualização de item existente (quantidade)
//   - Categorização automática via catálogo
//   - Logs estruturados
// ─────────────────────────────────────────────────────────────────────────────

import { ParsedCommand } from './voiceCommandParser';
import { Item, Category, CustomCategory } from '../types';

// Re-exportar VoiceCommand como alias para compatibilidade com VoiceCommandButton
export type { ParsedCommand as VoiceCommand };

export interface ExecutorContext {
  items: Item[];
  customCategories: CustomCategory[];
  addItem: (item: Item) => void;
  updateItem: (id: string, changes: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  toggleItem: (id: string) => void;
  addCustomCategory: (cat: CustomCategory) => void;
  removeCustomCategory: (id: string, moveItemsToOthers: () => void) => void;
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
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Busca item existente por nome.
 * Ordem: exato → inclusão → produto contém nome → nome contém produto
 */
function findItem(items: Item[], productName: string): Item | undefined {
  const v = normalize(productName);
  return (
    items.find(i => normalize(i.nome) === v) ??
    items.find(i => normalize(i.nome).includes(v)) ??
    items.find(i => v.includes(normalize(i.nome)))
  );
}

/** Busca categoria fixa ou personalizada pelo nome */
function findCategory(
  name: string,
  customCategories: CustomCategory[],
): { type: 'fixed'; name: Category } | { type: 'custom'; cat: CustomCategory } | null {
  const v = normalize(name);

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

/** Formata quantidade para exibição */
function fmtQty(quantity: number | null, unit: string | null): string {
  if (!quantity) return '1 un';
  return `${quantity} ${unit ?? 'un'}`;
}

/** Log estruturado */
function log(cmd: ParsedCommand, result: string): void {
  console.log(
    `[VOICE]\n` +
    `  Texto:     ${cmd.rawText}\n` +
    `  Action:    ${cmd.action}\n` +
    `  Product:   ${cmd.product ?? '-'}\n` +
    `  Quantity:  ${cmd.quantity ?? '-'}\n` +
    `  Unit:      ${cmd.unit ?? '-'}\n` +
    `  Category:  ${cmd.category ?? '-'}\n` +
    `  Result:    ${result}`
  );
}

// ─── Executor principal ───────────────────────────────────────────────────────

export function executeVoiceCommand(
  cmd: ParsedCommand,
  ctx: ExecutorContext,
): ExecutorResult {

  switch (cmd.action) {

    // ── Criar item no catálogo (SEM adicionar ao Modo Compras) ────────────────
    case 'create_catalog_item': {
      if (!cmd.product) {
        log(cmd, 'Erro: produto vazio');
        return { success: false, message: 'Nome do produto não informado.' };
      }

      const categoria = cmd.category ?? Category.OUTROS;
      const existing  = findItem(ctx.items, cmd.product);

      if (existing) {
        log(cmd, `Item já existe no catálogo: "${existing.nome}"`);
        return { success: false, message: `ℹ️ "${existing.nome}" já existe na categoria ${existing.categoria}.` };
      }

      const newItem: Item = {
        id:            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nome:          cmd.product,
        quantidade:    fmtQty(cmd.quantity, cmd.unit),
        unidade:       cmd.unit ?? 'un',
        categoria,
        comprado:      false,
        selecionado:   false,   // NÃO vai para Modo Compras
        frequencia:    1,
        ultima_compra: new Date().toISOString(),
      };

      ctx.addItem(newItem);

      console.log(
        `[VOICE]\n` +
        `  Texto:     ${cmd.rawText}\n` +
        `  Intent:    CREATE_CATALOG_ITEM\n` +
        `  Produto:   ${cmd.product}\n` +
        `  Categoria: ${categoria}\n` +
        `  Resultado: Criado no catálogo`
      );
      return { success: true, message: `📋 "${cmd.product}" criado na categoria ${categoria}.` };
    }

    // ── Adicionar item ao Modo Compras (selecionado: true) ───────────────────
    case 'add_to_shopping_list':
    case 'add_or_update_item': {
      if (!cmd.product) {
        log(cmd, 'Erro: produto vazio');
        return { success: false, message: 'Nome do produto não informado.' };
      }

      const quantidadeStr = fmtQty(cmd.quantity, cmd.unit);
      const categoria     = cmd.category ?? Category.OUTROS;
      const existing      = findItem(ctx.items, cmd.product);

      if (existing) {
        // Atualiza quantidade e marca como selecionado para o Modo Compras
        ctx.updateItem(existing.id, {
          quantidade: quantidadeStr,
          unidade:    cmd.unit ?? existing.unidade,
          selecionado: true,
        });
        console.log(
          `[VOICE]\n` +
          `  Texto:     ${cmd.rawText}\n` +
          `  Intent:    ADD_TO_SHOPPING_LIST\n` +
          `  Produto:   ${existing.nome}\n` +
          `  Quantidade:${quantidadeStr}\n` +
          `  Resultado: Adicionado ao Modo Compras`
        );
        return { success: true, message: `✅ "${existing.nome}" adicionado ao Modo Compras. Quantidade: ${quantidadeStr}.` };
      }

      // Item não existe → criar e já marcar como selecionado
      const newItem: Item = {
        id:            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nome:          cmd.product,
        quantidade:    quantidadeStr,
        unidade:       cmd.unit ?? 'un',
        categoria,
        comprado:      false,
        selecionado:   true,   // vai para Modo Compras
        frequencia:    1,
        ultima_compra: new Date().toISOString(),
      };

      ctx.addItem(newItem);

      console.log(
        `[VOICE]\n` +
        `  Texto:     ${cmd.rawText}\n` +
        `  Intent:    ADD_TO_SHOPPING_LIST\n` +
        `  Produto:   ${cmd.product}\n` +
        `  Quantidade:${quantidadeStr}\n` +
        `  Categoria: ${categoria}\n` +
        `  Resultado: Adicionado ao Modo Compras`
      );
      return { success: true, message: `✅ "${cmd.product}" adicionado ao Modo Compras em ${categoria}.` };
    }

    // ── Remover item ──────────────────────────────────────────────────────────
    case 'remove_item': {
      if (!cmd.product) {
        log(cmd, 'Erro: produto vazio');
        return { success: false, message: 'Nome do produto não informado.' };
      }

      const found = findItem(ctx.items, cmd.product);
      if (!found) {
        log(cmd, `Não encontrado: "${cmd.product}"`);
        return { success: false, message: `❌ Item "${cmd.product}" não encontrado.` };
      }

      ctx.deleteItem(found.id);
      log(cmd, `Removido: "${found.nome}"`);
      return { success: true, message: `🗑️ "${found.nome}" removido da lista.` };
    }

    // ── Marcar como comprado ──────────────────────────────────────────────────
    case 'mark_purchased': {
      if (!cmd.product) {
        log(cmd, 'Erro: produto vazio');
        return { success: false, message: 'Nome do produto não informado.' };
      }

      const found = findItem(ctx.items, cmd.product);

      if (found) {
        // Item encontrado — atualizar quantidade (se fornecida) e marcar como comprado
        const changes: Partial<Item> = { comprado: true };

        if (cmd.quantity) {
          changes.quantidade = fmtQty(cmd.quantity, cmd.unit);
        }

        ctx.updateItem(found.id, changes);

        // Se o item já estava comprado mas a quantidade mudou, não há problema
        const qtyInfo = cmd.quantity ? `. Quantidade: ${fmtQty(cmd.quantity, cmd.unit)}` : '';
        const alreadyMsg = found.comprado ? ` (já estava marcado)` : '';
        log(cmd, `Localizado e marcado como comprado: "${found.nome}"${qtyInfo}`);
        return {
          success: true,
          message: `✔️ "${found.nome}" marcado como comprado${alreadyMsg}${qtyInfo}.`,
        };
      }

      // Item não existe → criar na categoria correta e já marcar como comprado
      const categoria = cmd.category ?? Category.OUTROS;
      const newItem: Item = {
        id:            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nome:          cmd.product,
        quantidade:    fmtQty(cmd.quantity, cmd.unit),
        categoria,
        comprado:      true,
        frequencia:    1,
        ultima_compra: new Date().toISOString(),
      };
      ctx.addItem(newItem);
      log(cmd, `Criado e marcado como comprado: "${cmd.product}" em ${categoria}`);
      return {
        success: true,
        message: `✔️ "${cmd.product}" adicionado em ${categoria} e marcado como comprado.`,
      };
    }

    // ── Criar categoria ───────────────────────────────────────────────────────
    case 'create_category': {
      const nome = (cmd.product ?? cmd.entity ?? '').trim();
      if (!nome) {
        log(cmd, 'Erro: nome da categoria vazio');
        return { success: false, message: 'Nome da categoria não informado.' };
      }

      const exists = findCategory(nome, ctx.customCategories);
      if (exists) {
        const existingName = exists.type === 'fixed' ? exists.name : exists.cat.name;
        log(cmd, `Categoria já existe: "${existingName}"`);
        return { success: false, message: `ℹ️ Categoria "${existingName}" já existe.` };
      }

      const newCat: CustomCategory = {
        id:    `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name:  nome.charAt(0).toUpperCase() + nome.slice(1),
        icon:  '🏷️',
        color: 'bg-mint',
      };

      ctx.addCustomCategory(newCat);
      log(cmd, `Categoria criada: "${newCat.name}"`);
      return { success: true, message: `📁 Categoria "${newCat.name}" criada.` };
    }

    // ── Remover categoria ─────────────────────────────────────────────────────
    case 'remove_category': {
      const nome = (cmd.product ?? cmd.entity ?? '').trim();
      if (!nome) {
        log(cmd, 'Erro: nome da categoria vazio');
        return { success: false, message: 'Nome da categoria não informado.' };
      }

      const found = findCategory(nome, ctx.customCategories);
      if (!found) {
        log(cmd, `Categoria não encontrada: "${nome}"`);
        return { success: false, message: `❌ Categoria "${nome}" não encontrada.` };
      }

      if (found.type === 'fixed') {
        log(cmd, `Tentativa de remover categoria padrão: "${found.name}"`);
        return { success: false, message: `⚠️ "${found.name}" é uma categoria padrão e não pode ser removida.` };
      }

      ctx.removeCustomCategory(found.cat.id, () => {});
      log(cmd, `Categoria removida: "${found.cat.name}"`);
      return { success: true, message: `🗑️ Categoria "${found.cat.name}" removida.` };
    }

    // ── Desconhecido ──────────────────────────────────────────────────────────
    default:
      log(cmd, 'Ação desconhecida');
      return {
        success: false,
        message: '❓ Não entendi. Tente: "comprar 5 quilos de arroz", "adicionar leite", "criar categoria pet".',
      };
  }
}
