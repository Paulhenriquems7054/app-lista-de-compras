/**
 * useShoppingSync — v3
 *
 * Estratégia de sincronização revisada para funcionar com RLS + couple_id:
 *
 * PROBLEMA: postgres_changes com RLS filtra eventos pelo user_id da LINHA,
 * não pelas policies de SELECT. Isso significa que usuário B nunca recebe
 * eventos de linhas criadas por usuário A, mesmo com policy couple_id.
 *
 * SOLUÇÃO: ao receber qualquer evento Realtime (mesmo sem payload útil),
 * fazemos um refetch completo da lista. Isso garante que ambos os usuários
 * sempre vejam o estado atual do banco, independente de quem criou o item.
 *
 * Fluxo:
 * 1. Usuário A adiciona item → optimistic update local + upsert no Supabase
 * 2. Supabase dispara evento Realtime
 * 3. Usuário B recebe evento → faz refetch → vê o item de A
 * 4. Usuário A recebe o próprio evento → refetch idempotente (já tem o item)
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
  } catch {
    return [];
  }
}

function writeCache(userId: string, items: Item[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(items));
  } catch { /* QuotaExceededError — ignorar */ }
}

// ── Buscar couple_id ──────────────────────────────────────────────────────────

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

  const coupleIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  // Debounce ref para evitar refetches excessivos em cascata
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  // ── Refetch com debounce ────────────────────────────────────────────────────
  const scheduleRefetch = useCallback((delayMs = 300) => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(async () => {
      if (!supabase || isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const remoteItems = await fetchItems(userId);
        setItems(remoteItems);
        writeCache(userId, remoteItems);
        console.log('[useShoppingSync] 🔄 Refetch concluído:', remoteItems.length, 'itens');
      } finally {
        isFetchingRef.current = false;
      }
    }, delayMs);
  }, [userId]);

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

      // 1. couple_id
      coupleIdRef.current = await fetchCoupleId(userId);
      console.log('[useShoppingSync] couple_id:', coupleIdRef.current);

      // 2. Carga inicial
      const remoteItems = await fetchItems(userId);
      if (!cancelled) {
        setItems(remoteItems);
        writeCache(userId, remoteItems);
        setIsSynced(true);
        setIsLoading(false);
        console.log('[useShoppingSync] Carga inicial:', remoteItems.length, 'itens');
      }

      // 3. Cleanup canal anterior
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 4. Canal Realtime
      // Usamos nome único por instância para evitar conflito entre abas/dispositivos.
      // Ao receber QUALQUER evento na tabela, fazemos refetch completo.
      // Isso contorna a limitação do RLS no postgres_changes que só entrega
      // eventos ao dono da linha — com refetch, o parceiro vê tudo via SELECT.
      const channelId = `shopping_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shopping_items' },
          (payload) => {
            if (cancelled) return;
            console.log('[useShoppingSync] 📡 Evento Realtime recebido:', payload.eventType);
            // Refetch com pequeno delay para garantir que o banco já commitou
            scheduleRefetch(200);
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            console.log('[useShoppingSync] ✅ Realtime SUBSCRIBED:', channelId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useShoppingSync] ❌ CHANNEL_ERROR:', err);
          } else if (status === 'TIMED_OUT') {
            console.warn('[useShoppingSync] ⏱ TIMED_OUT — reconectando...');
          } else {
            console.log('[useShoppingSync] status:', status);
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
  }, [userId, scheduleRefetch]);

  // ── Persiste cache offline ────────────────────────────────────────────────
  useEffect(() => {
    if (userId && !isLoading) {
      writeCache(userId, items);
    }
  }, [items, userId, isLoading]);

  // ── addItem ───────────────────────────────────────────────────────────────
  const addItem = useCallback(async (item: Item) => {
    const now = new Date().toISOString();

    // Optimistic update
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
      console.error('[useShoppingSync] addItem error:', error);
      // Reverter optimistic update em caso de erro
      scheduleRefetch(0);
    }
  }, [userId, scheduleRefetch]);

  // ── updateItem ────────────────────────────────────────────────────────────
  const updateItem = useCallback(async (item: Item) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? item : i));

    const { error } = await upsertItem(item, userId, coupleIdRef.current);
    if (error) {
      console.error('[useShoppingSync] updateItem error:', error);
      scheduleRefetch(0);
    }
  }, [userId, scheduleRefetch]);

  // ── deleteItem ────────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));

    const { error } = await dbDeleteItem(id);
    if (error) {
      console.error('[useShoppingSync] deleteItem error:', error);
      scheduleRefetch(0);
    }
  }, [scheduleRefetch]);

  // ── toggleComprado ────────────────────────────────────────────────────────
  const toggleComprado = useCallback(async (id: string) => {
    let newValue = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) { newValue = !i.comprado; return { ...i, comprado: newValue }; }
        return i;
      }),
    );
    const { error } = await patchItem(id, { comprado: newValue });
    if (error) {
      console.error('[useShoppingSync] toggleComprado error:', error);
      scheduleRefetch(0);
    }
  }, [scheduleRefetch]);

  // ── toggleSelecionado ─────────────────────────────────────────────────────
  const toggleSelecionado = useCallback(async (id: string) => {
    let newValue = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) { newValue = !i.selecionado; return { ...i, selecionado: newValue }; }
        return i;
      }),
    );
    const { error } = await patchItem(id, { selecionado: newValue });
    if (error) {
      console.error('[useShoppingSync] toggleSelecionado error:', error);
      scheduleRefetch(0);
    }
  }, [scheduleRefetch]);

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
