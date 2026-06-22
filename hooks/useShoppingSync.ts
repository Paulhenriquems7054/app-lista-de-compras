/**
 * useShoppingSync
 *
 * Hook central de sincronização da lista de compras.
 *
 * Estratégia:
 * - Supabase é a fonte de verdade quando disponível.
 * - localStorage é o cache offline (chave: `{userId}:shoppingList`).
 * - Realtime: canal Supabase escuta INSERT/UPDATE/DELETE em shopping_items
 *   e aplica o diff no estado React sem re-fetch completo.
 *
 * Modo offline (sem Supabase configurado):
 * - Tudo funciona via localStorage, sem erros.
 * - Ao reconectar (Supabase disponível), na próxima montagem sincroniza.
 *
 * Uso no App.tsx:
 *   const { items, addItem, updateItem, deleteItem, toggleItem,
 *           toggleSelecionado, isLoading, isSynced } = useShoppingSync(userId);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Item } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  fetchItems,
  upsertItem,
  patchItem,
  deleteItem as dbDeleteItem,
  getCoupleId,
  dbToItem,
  DbShoppingItem,
} from '../services/shoppingService';

// Chave de cache offline
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
  } catch {
    // QuotaExceededError — ignorar
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseShoppingSyncReturn {
  items: Item[];
  isLoading: boolean;
  isSynced: boolean; // true = dados vieram do Supabase
  addItem: (item: Item) => Promise<void>;
  updateItem: (item: Item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleComprado: (id: string) => Promise<void>;
  toggleSelecionado: (id: string) => Promise<void>;
  /** Substitui toda a lista (usado em import/restore) */
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

export function useShoppingSync(userId: string): UseShoppingSyncReturn {
  const [items, setItems] = useState<Item[]>(() => readCache(userId));
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const coupleIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  // ── Carga inicial + setup Realtime ────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      // 1. Buscar couple_id
      coupleIdRef.current = await getCoupleId(userId);

      if (!supabase) {
        // Modo offline — usar apenas cache
        setIsLoading(false);
        return;
      }

      // 2. Carregar itens do Supabase
      const remoteItems = await fetchItems(userId);
      if (!cancelled) {
        setItems(remoteItems);
        writeCache(userId, remoteItems);
        setIsSynced(true);
        setIsLoading(false);
      }

      // 3. Assinar canal Realtime
      // Remove canal anterior se existir (troca de userId)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`shopping_items:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shopping_items',
          },
          (payload) => {
            if (cancelled) return;

            const { eventType, new: newRow, old: oldRow } = payload;

            setItems((prev) => {
              let next: Item[];

              if (eventType === 'INSERT') {
                const incoming = dbToItem(newRow as DbShoppingItem);
                // Evita duplicata se o próprio usuário inseriu (já está no estado)
                if (prev.some((i) => i.id === incoming.id)) return prev;
                next = [...prev, incoming];
              } else if (eventType === 'UPDATE') {
                const updated = dbToItem(newRow as DbShoppingItem);
                next = prev.map((i) => (i.id === updated.id ? updated : i));
              } else if (eventType === 'DELETE') {
                const deletedId = (oldRow as { id: string }).id;
                next = prev.filter((i) => i.id !== deletedId);
              } else {
                return prev;
              }

              writeCache(userId, next);
              return next;
            });
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[useShoppingSync] Realtime conectado.');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('[useShoppingSync] Realtime desconectado:', status);
          }
        });

      channelRef.current = channel;
    };

    init();

    return () => {
      cancelled = true;
      // Desinscrever canal ao desmontar / trocar userId
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  // ── Persistir cache toda vez que items mudar (modo offline) ───────────────
  useEffect(() => {
    if (userId && !isLoading) {
      writeCache(userId, items);
    }
  }, [items, userId, isLoading]);

  // ── addItem ───────────────────────────────────────────────────────────────
  const addItem = useCallback(
    async (item: Item) => {
      // Optimistic update
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id
              ? { ...item, frequencia: i.frequencia + 1, ultima_compra: new Date().toISOString() }
              : i,
          );
        }
        return [...prev, { ...item, ultima_compra: new Date().toISOString() }];
      });

      // Persistir no Supabase (sem aguardar — fire and forget com log de erro)
      await upsertItem(
        { ...item, ultima_compra: new Date().toISOString() },
        userId,
        coupleIdRef.current,
      );
    },
    [userId],
  );

  // ── updateItem ────────────────────────────────────────────────────────────
  const updateItem = useCallback(
    async (item: Item) => {
      // Optimistic update
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));

      await upsertItem(item, userId, coupleIdRef.current);
    },
    [userId],
  );

  // ── deleteItem ────────────────────────────────────────────────────────────
  const deleteItem = useCallback(
    async (id: string) => {
      // Optimistic update
      setItems((prev) => prev.filter((i) => i.id !== id));

      await dbDeleteItem(id);
    },
    [],
  );

  // ── toggleComprado ────────────────────────────────────────────────────────
  const toggleComprado = useCallback(
    async (id: string) => {
      let newValue = false;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === id) {
            newValue = !i.comprado;
            return { ...i, comprado: newValue };
          }
          return i;
        }),
      );

      await patchItem(id, { comprado: newValue });
    },
    [],
  );

  // ── toggleSelecionado ─────────────────────────────────────────────────────
  const toggleSelecionado = useCallback(
    async (id: string) => {
      let newValue = false;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === id) {
            newValue = !i.selecionado;
            return { ...i, selecionado: newValue };
          }
          return i;
        }),
      );

      await patchItem(id, { selecionado: newValue });
    },
    [],
  );

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
