/**
 * useShoppingSync — v4
 *
 * Correção do bug "marca e desmarca":
 *
 * O problema era que o próprio dispositivo recebia o evento Realtime
 * da sua própria mutação e disparava um refetch que sobrescrevia o
 * optimistic update antes do banco confirmar o novo valor.
 *
 * Solução:
 * - Após qualquer mutação local, registra o id do item em um Set de
 *   "operações pendentes" com timestamp.
 * - Ao receber evento Realtime, verifica se o item estava em operação
 *   local recente (< 2s). Se sim, ignora o evento para esse item.
 * - Refetch só acontece para eventos de itens que o dispositivo
 *   NÃO modificou recentemente (eventos do parceiro).
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

// Janela de supressão: eventos Realtime dentro deste período após uma mutação
// local são ignorados (são eco do próprio dispositivo)
const SUPPRESS_WINDOW_MS = 3000;

export function useShoppingSync(userId: string): UseShoppingSyncReturn {
  const [items, setItems] = useState<Item[]>(() => readCache(userId));
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  const coupleIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  // Set de ids de itens modificados localmente recentemente
  // Map<itemId, timestamp da última mutação>
  const localMutationsRef = useRef<Map<string, number>>(new Map());

  // ── Registrar mutação local ───────────────────────────────────────────────
  const markLocalMutation = useCallback((itemId: string) => {
    localMutationsRef.current.set(itemId, Date.now());
    // Limpar entradas antigas automaticamente
    setTimeout(() => {
      const entry = localMutationsRef.current.get(itemId);
      if (entry && Date.now() - entry >= SUPPRESS_WINDOW_MS) {
        localMutationsRef.current.delete(itemId);
      }
    }, SUPPRESS_WINDOW_MS + 100);
  }, []);

  // ── Verificar se evento é eco local ──────────────────────────────────────
  const isLocalEcho = useCallback((itemId: string): boolean => {
    const ts = localMutationsRef.current.get(itemId);
    if (!ts) return false;
    return Date.now() - ts < SUPPRESS_WINDOW_MS;
  }, []);

  // ── Refetch completo ──────────────────────────────────────────────────────
  const doRefetch = useCallback(async () => {
    if (!supabase || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const remoteItems = await fetchItems(userId);
      setItems(remoteItems);
      writeCache(userId, remoteItems);
      console.log('[useShoppingSync] 🔄 Refetch:', remoteItems.length, 'itens');
    } finally {
      isFetchingRef.current = false;
    }
  }, [userId]);

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
      const channelId = `shopping_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shopping_items' },
          (payload) => {
            if (cancelled) return;

            // Extrair o id do item afetado
            const affectedId =
              (payload.new as { id?: string })?.id ||
              (payload.old as { id?: string })?.id;

            console.log('[useShoppingSync] 📡 Evento:', payload.eventType, '| id:', affectedId);

            // Se é eco de mutação local, ignorar completamente
            if (affectedId && isLocalEcho(affectedId)) {
              console.log('[useShoppingSync] 🔇 Eco local ignorado:', affectedId);
              return;
            }

            // Evento do parceiro — fazer refetch para ver as mudanças dele
            console.log('[useShoppingSync] 👫 Evento do parceiro — refetch');
            scheduleRefetch(300);
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            console.log('[useShoppingSync] ✅ SUBSCRIBED:', channelId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useShoppingSync] ❌ CHANNEL_ERROR:', err);
          } else if (status === 'TIMED_OUT') {
            console.warn('[useShoppingSync] ⏱ TIMED_OUT');
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

    // Registrar mutação local ANTES do optimistic update
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
      console.error('[useShoppingSync] addItem error:', error);
      localMutationsRef.current.delete(item.id);
      scheduleRefetch(0);
    }
  }, [userId, markLocalMutation, scheduleRefetch]);

  // ── updateItem ────────────────────────────────────────────────────────────
  const updateItem = useCallback(async (item: Item) => {
    markLocalMutation(item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? item : i));

    const { error } = await upsertItem(item, userId, coupleIdRef.current);
    if (error) {
      console.error('[useShoppingSync] updateItem error:', error);
      localMutationsRef.current.delete(item.id);
      scheduleRefetch(0);
    }
  }, [userId, markLocalMutation, scheduleRefetch]);

  // ── deleteItem ────────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id: string) => {
    markLocalMutation(id);
    setItems((prev) => prev.filter((i) => i.id !== id));

    const { error } = await dbDeleteItem(id);
    if (error) {
      console.error('[useShoppingSync] deleteItem error:', error);
      localMutationsRef.current.delete(id);
      scheduleRefetch(0);
    }
  }, [markLocalMutation, scheduleRefetch]);

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
      console.error('[useShoppingSync] toggleComprado error:', error);
      localMutationsRef.current.delete(id);
      scheduleRefetch(0);
    }
  }, [markLocalMutation, scheduleRefetch]);

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
      console.error('[useShoppingSync] toggleSelecionado error:', error);
      localMutationsRef.current.delete(id);
      scheduleRefetch(0);
    }
  }, [markLocalMutation, scheduleRefetch]);

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
