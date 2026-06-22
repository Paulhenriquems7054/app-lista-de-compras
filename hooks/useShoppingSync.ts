/**
 * useShoppingSync — v5
 *
 * Correção definitiva do bug "desmarca itens":
 *
 * Causa raiz identificada: o refetch retornava [] quando o banco estava
 * vazio (upsert falhando por RLS) e sobrescrevia o estado local completo.
 *
 * Mudanças nesta versão:
 * 1. Refetch NUNCA substitui o estado local se retornar menos itens que
 *    o estado atual — protege contra banco vazio ou erro de RLS.
 * 2. Refetch faz MERGE: itens remotos sobrescrevem locais pelo id,
 *    mas itens locais sem correspondência remota são mantidos.
 * 3. Supressão de eco local mantida (janela 3s por item).
 * 4. Log detalhado de erros de upsert para diagnóstico.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Item } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  fetchItems,
  upsertItem,
  patchItem,
  deleteItem as dbDeleteItem,
} from '../services/shoppingService';

// ── Cache offline ─────────────────────────────────────────────────────────────

const cacheKey = (userId: string) => `${userId}:shoppingList`;

function readCache(userId: string): Item[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeCache(userId: string, items: Item[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(items));
  } catch { /* ignorar */ }
}

// ── couple_id ─────────────────────────────────────────────────────────────────

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

const SUPPRESS_WINDOW_MS = 4000;

export function useShoppingSync(userId: string): UseShoppingSyncReturn {
  const [items, setItems] = useState<Item[]>(() => readCache(userId));
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  const coupleIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  // Map<itemId, timestamp> — mutações feitas localmente nesta sessão
  const localMutationsRef = useRef<Map<string, number>>(new Map());

  const markLocalMutation = useCallback((itemId: string) => {
    localMutationsRef.current.set(itemId, Date.now());
    setTimeout(() => {
      const ts = localMutationsRef.current.get(itemId);
      if (ts && Date.now() - ts >= SUPPRESS_WINDOW_MS) {
        localMutationsRef.current.delete(itemId);
      }
    }, SUPPRESS_WINDOW_MS + 200);
  }, []);

  const isLocalEcho = useCallback((itemId: string): boolean => {
    const ts = localMutationsRef.current.get(itemId);
    return ts != null && Date.now() - ts < SUPPRESS_WINDOW_MS;
  }, []);

  // ── Refetch seguro: merge, nunca substitui por lista menor ───────────────
  const doRefetch = useCallback(async () => {
    if (!supabase || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const remoteItems = await fetchItems(userId);

      // null = erro no fetch — não tocar no estado
      if (remoteItems === null) {
        console.warn('[useShoppingSync] fetchItems retornou null — estado preservado');
        return;
      }

      setItems((prev) => {
        // Se o banco retornou vazio mas temos itens locais,
        // provavelmente o upsert ainda não funcionou — manter local
        if (remoteItems.length === 0 && prev.length > 0) {
          console.warn('[useShoppingSync] Refetch retornou 0 itens, mantendo estado local com', prev.length, 'itens');
          return prev;
        }

        // Merge: construir mapa dos remotos, depois mesclar com locais
        const remoteMap = new Map(remoteItems.map(i => [i.id, i]));

        // Itens locais com mutação pendente mantêm seu estado local
        const merged = prev.map(local => {
          if (isLocalEcho(local.id)) {
            // Item com mutação pendente: manter estado local
            return local;
          }
          // Usar versão remota se existir
          return remoteMap.get(local.id) ?? local;
        });

        // Adicionar itens remotos que não estavam no estado local
        const localIds = new Set(prev.map(i => i.id));
        const newRemote = remoteItems.filter(r => !localIds.has(r.id));

        const result = [...merged, ...newRemote];
        writeCache(userId, result);
        console.log('[useShoppingSync] 🔄 Refetch merge:', result.length, 'itens (remote:', remoteItems.length, ')');
        return result;
      });
    } catch (err) {
      console.error('[useShoppingSync] doRefetch error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [userId, isLocalEcho]);

  const scheduleRefetch = useCallback((delayMs = 500) => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(doRefetch, delayMs);
  }, [doRefetch]);

  // ── Carga inicial + Realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    let cancelled = false;

    const init = async () => {
      if (!supabase) { setIsLoading(false); return; }

      // 1. couple_id
      coupleIdRef.current = await fetchCoupleId(userId);
      console.log('[useShoppingSync] userId:', userId, '| couple_id:', coupleIdRef.current);

      // 2. Carga inicial — substitui cache apenas se banco tiver dados
      const remoteItems = await fetchItems(userId);
      if (!cancelled) {
        if (remoteItems !== null && remoteItems.length > 0) {
          setItems(remoteItems);
          writeCache(userId, remoteItems);
          console.log('[useShoppingSync] Carga inicial do banco:', remoteItems.length, 'itens');
        } else if (remoteItems === null) {
          console.warn('[useShoppingSync] Erro ao buscar itens — usando cache local');
        } else {
          console.log('[useShoppingSync] Banco vazio — usando cache local:', readCache(userId).length, 'itens');
        }
        setIsSynced(true);
        setIsLoading(false);
      }

      // 3. Cleanup
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 4. Canal Realtime
      const channelId = `shopping_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shopping_items' },
          (payload) => {
            if (cancelled) return;

            const affectedId =
              (payload.new as { id?: string })?.id ||
              (payload.old as { id?: string })?.id;

            if (affectedId && isLocalEcho(affectedId)) {
              console.log('[useShoppingSync] 🔇 Eco ignorado:', affectedId);
              return;
            }

            console.log('[useShoppingSync] 👫 Evento parceiro:', payload.eventType, affectedId);
            scheduleRefetch(400);
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            console.log('[useShoppingSync] ✅ SUBSCRIBED:', channelId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useShoppingSync] ❌ CHANNEL_ERROR:', err);
          }
        });

      channelRef.current = channel;
    };

    init();

    return () => {
      cancelled = true;
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, scheduleRefetch, isLocalEcho]);

  // ── Cache offline ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (userId && !isLoading) writeCache(userId, items);
  }, [items, userId, isLoading]);

  // ── addItem ───────────────────────────────────────────────────────────────
  const addItem = useCallback(async (item: Item) => {
    const now = new Date().toISOString();
    markLocalMutation(item.id);

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

    const { error } = await upsertItem(
      { ...item, ultima_compra: now },
      userId,
      coupleIdRef.current,
    );
    if (error) {
      console.error('[useShoppingSync] addItem ERRO — upsert falhou. Possível problema de RLS:', error);
    }
  }, [userId, markLocalMutation]);

  // ── updateItem ────────────────────────────────────────────────────────────
  const updateItem = useCallback(async (item: Item) => {
    markLocalMutation(item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? item : i));

    const { error } = await upsertItem(item, userId, coupleIdRef.current);
    if (error) {
      console.error('[useShoppingSync] updateItem ERRO:', error);
    }
  }, [userId, markLocalMutation]);

  // ── deleteItem ────────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id: string) => {
    markLocalMutation(id);
    setItems((prev) => prev.filter((i) => i.id !== id));

    const { error } = await dbDeleteItem(id);
    if (error) {
      console.error('[useShoppingSync] deleteItem ERRO:', error);
    }
  }, [markLocalMutation]);

  // ── toggleComprado ────────────────────────────────────────────────────────
  const toggleComprado = useCallback(async (id: string) => {
    markLocalMutation(id);
    let newValue = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) { newValue = !i.comprado; return { ...i, comprado: newValue }; }
        return i;
      }),
    );
    const { error } = await patchItem(id, { comprado: newValue });
    if (error) {
      console.error('[useShoppingSync] toggleComprado ERRO:', error);
    }
  }, [markLocalMutation]);

  // ── toggleSelecionado ─────────────────────────────────────────────────────
  const toggleSelecionado = useCallback(async (id: string) => {
    markLocalMutation(id);
    let newValue = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) { newValue = !i.selecionado; return { ...i, selecionado: newValue }; }
        return i;
      }),
    );
    const { error } = await patchItem(id, { selecionado: newValue });
    if (error) {
      console.error('[useShoppingSync] toggleSelecionado ERRO:', error);
    }
  }, [markLocalMutation]);

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
