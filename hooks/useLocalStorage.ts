import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';

/**
 * useLocalStorage — versão com guards de corrupção.
 *
 * Comportamento em caso de falha:
 * - JSON inválido → retorna initialValue e loga aviso (não lança exceção)
 * - Tipo inesperado → retorna initialValue (ex: espera array, recebe objeto)
 * - localStorage cheio (QuotaExceededError) → loga aviso, valor em memória é mantido
 * - SSR / localStorage indisponível → usa initialValue silenciosamente
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (v: unknown) => v is T,
): [T, Dispatch<SetStateAction<T>>] {
  // Leitura inicial síncrona (só executada uma vez)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;

      const parsed: unknown = JSON.parse(raw);

      // Se um validador foi fornecido, usá-lo
      if (validate) {
        return validate(parsed) ? parsed : initialValue;
      }

      // Validação de tipo básica: array deve continuar array
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) {
        console.warn(`[useLocalStorage] "${key}" esperava array, recebeu ${typeof parsed}. Resetando.`);
        return initialValue;
      }

      return parsed as T;
    } catch (err) {
      console.warn(`[useLocalStorage] Falha ao ler "${key}" do localStorage:`, err);
      return initialValue;
    }
  });

  // Ref para evitar write desnecessário na primeira renderização
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Pular na montagem inicial para não sobrescrever valor existente desnecessariamente
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (err: unknown) {
      // QuotaExceededError: espaço cheio — manter valor em memória
      const name = err instanceof Error ? err.name : '';
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn(`[useLocalStorage] "${key}" — localStorage cheio. Dado mantido apenas em memória.`);
      } else {
        console.warn(`[useLocalStorage] Falha ao gravar "${key}":`, err);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
