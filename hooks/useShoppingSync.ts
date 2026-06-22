/**
 * useShoppingSync
 *
 * Hook central de sincronização da lista de compras.
 *
 * Suporte a dois cenários:
 * 1. Mesma conta em dois dispositivos (userId igual)
 * 2. Contas separadas vinculadas por couple_id
 *
 * Estratégia:
 * - Supabase é a fonte de verdade quando disponível.
 * - localStorage é cache offline.
 * - Realtime: escuta INSERT/UPDATE/DELETE em shopping_items
 *   filtrando por user_id OU couple_id.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Item } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  fetchItems,
  upsertItem,
  patchItem,
  deleteItem as dbDeleteItem,
  dbToItem,
  DbShoppingItem,
} from '../services/shoppingService';

// ── Cache offline ─────────────────────────────────────────────────────────────

const cacheKey = (userId: string) => `${userId}:shoppingList`;

function readCache(userId: string): Item[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(userId: string, items: Item[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(items));
  } catch { /* QuotaExceededError — ignorar */ }
}

// ── Buscar couple_id diretamente (sem cache de módulo) ────────────────────────

async function fetchCoupleId(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('id', userId)
    .single();
  return data?.couple_id ?? null;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UseShoppingSyncReturn {
  items: Item[];
  isLoading: boolean;
  isSynced: boolean;
  addItem: (item: Item) => Promise<void>;
  updateItem: (item: Item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleComprado: (id: string) => Promise<void>;
  toggleSelecionado: (id: string) => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useShoppingSync(userId: string): UseShoppingSyncReturn {
  const [items, setItems] = useState<Item[]>(() => readCache(userId));
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // couple_id em ref para não causar re-render
  const coupleIdRef = useRef<string | null>(null);
  // Ref do canal Realtime para cleanup
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  // ── Carga inicial + Realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      // 1. Buscar couple_id (sem cache de módulo — sempre fresco)
      coupleIdRef.current = await fetchCoupleId(userId);

      // 2. Carregar todos os itens visíveis (RLS retorna próprios + casal)
      const remoteItems = await fetchItems(userId);
      if (!cancelled) {
        setItems(remoteItems);
        writeCache(userId, remoteItems);
        setIsSynced(true);
        setIsLoading(false);
      }

      // 3. Cleanup canal anterior
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 4. Montar canal Realtime
      //
      // IMPORTANTE: usamos um nome de canal único por instância do browser
      // para evitar conflito quando o mesmo userId abre em dois dispositivos.
      // O UUID aleatório no nome garante que cada aba/dispositivo tenha
      // seu próprio canal independente.
      //
      // Escutamos TODOS os eventos da tabela shopping_items sem filtro
      // no canal — o RLS do Supabase já garante que só chegam eventos
      // dos itens que o usuário tem permissão de ver (próprios + casal).
      const channelId = `shopping_sync_${userId}_${Math.random().toString(36).slice(2, 8)}`;

      const channel = supabase
        .channel(channelId)
        .on<DbShoppingItem>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shopping_items',
          },
          (payload) => {
            if (cancelled) return;

            const { eventType } = payload;

            setItems((prev) => {
              if (eventType === 'INSERT') {
                const incoming = dbToItem(payload.new as DbShoppingItem);
                // Evita duplicata — optimistic update já adicionou localmente
                if (prev.some((i) => i.id === incoming.id)) {
                  // Atualiza mesmo assim para garantir que o estado remoto
                  // (com id real do banco) sobrescreva o estado local
                  return prev.map((i) => i.id === incoming.id ? incoming : i);
                }
                const next = [...prev, incoming];
                writeCache(userId, next);
                return next;

              } else if (eventType === 'UPDATE') {
                const updated = dbToItem(payload.new as DbShoppingItem);
                const next = prev.map((i) => i.id === updated.id ? updated : i);
                writeCache(userId, next);
                return next;

              } else if (eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                const next = prev.filter((i) => i.id !== deletedId);
                writeCache(userId, next);
                return next;
              }

              return prev;
            });
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            console.log('[useShoppingSync] ✅ Realtime conectado:', channelId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useShoppingSync] ❌ Realtime erro:', err);
          } else if (status === 'TIMED_OUT') {
            console.warn('[useShoppingSync] ⏱ Realtime timeout — reconectando...');
          }
        });

      channelRef.current = channel;
    };

    init();

    return () => {
      cancelled = true;
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]); // re-executa apenas se userId mudar

  // ── Cache offline: persiste a cada mudança de items ───────────────────────
  useEffect(() => {
    if (userId && !isLoading) {
      writeCache(userId, items);
    }
  }, [items, userId, isLoading]);

  // ── addItem ───────────────────────────────────────────────────────────────
  const addItem = useCallback(async (item: Item) => {
    // Optimistic update imediato
    const now = new Date().toISOString();
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...item, frequencia: i.frequencia + 1, ultima_compra: now }
            : i,
        );
      }
      return [...prev, { ...item, ultima_compra: now }];
    });

    // Gravar no Supabase — o Realtime vai propagar para o outro dispositivo
    const { error } = await upsertItem(
      { ...item, ultima_compra: now },
      userId,
      coupleIdRef.current,
    );
    if (error) {
      console.error('[useShoppingSync] addItem falhou:', error);
    }
  }, [userId]);

  // ── updateItem ────────────────────────────────────────────────────────────
  const updateItem = useCallback(async (item: Item) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? item : i));

    const { error } = await upsertItem(item, userId, coupleIdRef.current);
    if (error) {
      console.error('[useShoppingSync] updateItem falhou:', error);
    }
  }, [userId]);

  // ── deleteItem ────────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));

    const { error } = await dbDeleteItem(id);
    if (error) {
      console.error('[useShoppingSync] deleteItem falhou:', error);
    }
  }, []);

  // ── toggleComprado ────────────────────────────────────────────────────────
  const toggleComprado = useCallback(async (id: string) => {
    let newValue = false;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          newValue = !i.comprado;
          return { ...i, comprado: newValue };
        }
        return i;
      }),
    );

    const { error } = await patchItem(id, { comprado: newValue });
    if (error) {
      console.error('[useShoppingSync] toggleComprado falhou:', error);
    }
  }, []);

  // ── toggleSelecionado ─────────────────────────────────────────────────────
  const toggleSelecionado = useCallback(async (id: string) => {
    let newValue = false;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          newValue = !i.selecionado;
          return { ...i, selecionado: newValue };
        }
        return i;
      }),
    );

    const { error } = await patchItem(id, { selecionado: newValue });
    if (error) {
      console.error('[useShoppingSync] toggleSelecionado falhou:', error);
    }
  }, []);

  return {
    items,
    isLoading,
    isSynced,
    addItem,
    updateItem,
    deleteItem,
    toggleComprado,
    toggleSelecionado,
    setItems,
  };
}
