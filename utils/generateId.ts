/**
 * Gera um UUID v4 compatível com a coluna id (UUID PRIMARY KEY) do Supabase.
 * Usa crypto.randomUUID() quando disponível (browsers modernos),
 * com fallback para implementação manual.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC 4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
