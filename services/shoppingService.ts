/**
 * shoppingService.ts
 *
 * Camada de acesso ao Supabase para shopping_items.
 * Cada operação aceita um Item do frontend e converte
 * para o schema da tabela (e vice-versa).
 *
 * Nunca toca em localStorage — isso é responsabilidade
 * do hook useShoppingSync.
 */

import { supabase } from '../lib/supabaseClient';
import { Item, Category } from '../types';

// ── Tipos internos ────────────────────────────────────────────────────────────

/** Linha da tabela shopping_items no Supabase */
export interface DbShoppingItem {
  id: string;
  user_id: string;
  couple_id: string | null;
  created_by: string | null;
  nome: string;
  quantidade: string;
  unidade: string;
  categoria: string;
  comprado: boolean;
  selecionado: boolean;
  frequencia: number;
  ultima_compra: string;
  dias_entre_compras: number | null;
  preco_medio: number | null;
  historico_precos: number[];
  preco_unitario: number | null;
  local_compra: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

// ── Conversão DB → Item ───────────────────────────────────────────────────────

export function dbToItem(row: DbShoppingItem): Item {
  return {
    id: row.id,
    nome: row.nome,
    quantidade: row.quantidade,
    unidade: row.unidade || 'un',
    categoria: row.categoria as Category,
    comprado: row.comprado,
    selecionado: row.selecionado ?? false,
    frequencia: row.frequencia,
    ultima_compra: row.ultima_compra,
    dias_entre_compras: row.dias_entre_compras ?? undefined,
    preco_medio: row.preco_medio ?? undefined,
    historico_precos: row.historico_precos ?? [],
    precoUnitario: row.preco_unitario ?? undefined,
    localCompra: row.local_compra ?? undefined,
    observacao: row.observacao ?? undefined,
  };
}

// ── Conversão Item → DB (apenas campos editáveis) ─────────────────────────────

function itemToDbPatch(item: Item, userId: string, coupleId: string | null) {
  return {
    id: item.id,
    user_id: userId,
    couple_id: coupleId,
    created_by: userId,
    nome: item.nome.trim(),
    quantidade: item.quantidade,
    unidade: item.unidade || 'un',
    categoria: item.categoria,
    comprado: item.comprado,
    selecionado: item.selecionado ?? false,
    frequencia: item.frequencia,
    ultima_compra: item.ultima_compra,
    dias_entre_compras: item.dias_entre_compras ?? null,
    preco_medio: item.preco_medio ?? null,
    historico_precos: item.historico_precos ?? [],
    preco_unitario: item.precoUnitario ?? null,
    local_compra: item.localCompra ?? null,
    observacao: item.observacao ?? null,
  };
}

// ── Buscar couple_id do usuário ───────────────────────────────────────────────

let _coupleIdCache: string | null | undefined = undefined; // undefined = não buscou ainda

export async function getCoupleId(userId: string): Promise<string | null> {
  if (!supabase) return null;
  if (_coupleIdCache !== undefined) return _coupleIdCache;

  const { data } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', userId)
    .single();

  _coupleIdCache = data?.couple_id ?? null;
  return _coupleIdCache;
}

/** Invalida o cache de couple_id (usar após vincular/desvincular casal) */
export function invalidateCoupleIdCache() {
  _coupleIdCache = undefined;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Carrega todos os itens visíveis ao usuário (próprios + do casal se vinculado).
 * RLS do Supabase garante o filtro correto.
 */
export async function fetchItems(userId: string): Promise<Item[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[shoppingService] fetchItems error:', error.message);
    return [];
  }

  return (data as DbShoppingItem[]).map(dbToItem);
}

/**
 * Insere ou atualiza um item (upsert por id).
 * Se o item já existe (mesmo id), atualiza. Caso contrário, insere.
 */
export async function upsertItem(
  item: Item,
  userId: string,
  coupleId: string | null,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: null }; // modo offline — sem-op

  const patch = itemToDbPatch(item, userId, coupleId);

  const { error } = await supabase
    .from('shopping_items')
    .upsert(patch, { onConflict: 'id' });

  if (error) {
    console.error('[shoppingService] upsertItem error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Atualiza campos parciais de um item existente.
 * Usado para toggles (comprado/selecionado) e edições inline (qty, preço).
 */
export async function patchItem(
  id: string,
  changes: Partial<Omit<DbShoppingItem, 'id' | 'user_id' | 'created_at'>>,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };

  const { error } = await supabase
    .from('shopping_items')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[shoppingService] patchItem error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Exclui um item pelo id.
 */
export async function deleteItem(id: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[shoppingService] deleteItem error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Exclui todos os itens de uma categoria (para o usuário/casal).
 * RLS garante que só itens visíveis serão excluídos.
 */
export async function deleteItemsByCategory(
  categoria: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('categoria', categoria);

  if (error) {
    console.error('[shoppingService] deleteItemsByCategory error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Exclui todos os itens que estão marcados como comprado.
 * Usado ao arquivar a lista.
 */
export async function deleteComprados(): Promise<{ error: string | null }> {
  if (!supabase) return { error: null };

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('comprado', true);

  if (error) {
    console.error('[shoppingService] deleteComprados error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
