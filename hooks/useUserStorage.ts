import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Versão de useLocalStorage isolada por userId.
 * Cada usuário tem suas próprias chaves: `{userId}:{key}`
 *
 * Garante que dados do Casal A nunca vazem para o Casal B.
 */
export function useUserStorage<T>(
  userId: string,
  key: string,
  initialValue: T,
): ReturnType<typeof useLocalStorage<T>> {
  const scopedKey = userId ? `${userId}:${key}` : key;
  return useLocalStorage<T>(scopedKey, initialValue);
}

/**
 * Migra dados legados (sem userId) para o escopo do userId fornecido.
 * Chamada uma única vez após o primeiro login.
 * Registra a migração em `lc_migration_log`.
 */
export function migrateLeacyDataToUser(userId: string): { migrated: string[]; skipped: string[] } {
  const LEGACY_KEYS = ['shoppingList', 'archivedLists', 'purchaseHistory', 'customCategories'];
  const OTHER_KEYS  = ['shoppingBudget', 'notificationSettings', 'menuHintShown', 'darkMode'];
  const ALL_KEYS    = [...LEGACY_KEYS, ...OTHER_KEYS];

  const migrated: string[] = [];
  const skipped: string[]  = [];

  for (const key of ALL_KEYS) {
    const scopedKey = `${userId}:${key}`;

    // Não sobrescrever se o usuário já tem dados no escopo
    const existing = localStorage.getItem(scopedKey);
    if (existing !== null) {
      skipped.push(key);
      continue;
    }

    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      try {
        localStorage.setItem(scopedKey, legacy);
        migrated.push(key);
      } catch {
        // QuotaExceededError — pular silenciosamente
      }
    }
  }

  if (migrated.length > 0) {
    // Registrar log de migração
    try {
      const log = JSON.parse(localStorage.getItem('lc_migration_log') ?? '[]') as object[];
      log.push({
        userId,
        migratedAt: new Date().toISOString(),
        keys: migrated,
      });
      localStorage.setItem('lc_migration_log', JSON.stringify(log));
    } catch {
      // Ignorar falha no log
    }
  }

  return { migrated, skipped };
}
