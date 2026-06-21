
export enum Category {
  FRUTAS_E_VERDURAS = "Frutas e Verduras",
  CARNES_E_FRIOS = "Carnes e Frios",
  LATICINIOS = "Laticínios",
  PADARIA = "Padaria",
  MERCEARIA = "Mercearia",
  LIMPEZA = "Limpeza",
  HIGIENE_PESSOAL = "Higiene Pessoal",
  BEBIDAS = "Bebidas",
  OUTROS = "Outros",
}

export interface Item {
  id: string;
  nome: string;
  quantidade: string;
  categoria: Category;
  comprado: boolean;
  selecionado?: boolean; // true = item está na lista de compras pendentes (CategoryModal)
  frequencia: number;
  ultima_compra: string;
  preco_medio?: number;
  historico_precos?: number[];
  dias_entre_compras?: number;
  // Correção 3 — Observação
  observacao?: string;
  // Correção 4 — Controle de Preços
  precoUnitario?: number;
  localCompra?: string;
  // Unidade de medida: unidade, kg, g, L, ml, cx, etc.
  unidade?: string;
}

/** Um registro individual de compra — criado ao arquivar lista */
export interface PurchaseRecord {
  id: string;           // uuid
  itemNome: string;     // nome normalizado (lowercase trim)
  categoria: Category;
  quantidade: string;
  precoUnitario?: number;
  precoTotal?: number;
  dataCompra: string;   // ISO Date String
  // Correção 6 — campos detalhados no histórico
  localCompra?: string;
  observacao?: string;
}

/**
 * Correção 5/6 — Histórico agrupado por sessão de compra.
 * Gerado ao clicar em "Finalizar Compras" / "Arquivar".
 */
export interface PurchaseHistory {
  id: string;           // uuid da sessão
  data: string;         // ISO Date String
  itens: PurchaseRecord[];
  totalItens: number;
  valorTotal: number;   // soma de precoUnitario dos itens com preço
}

/** Estatísticas calculadas por produto
 * Correção 7 — estrutura preparada para comparação de preços futura
 */
export interface ProductStats {
  nome: string;
  categoria: Category;
  totalCompras: number;           // vezes comprado
  quantidadeTotalTexto: string;   // ex: "8 vezes"
  frequenciaMensalMedia: number;  // compras/mês
  frequenciaSemanailMedia: number;// compras/semana
  ultimaCompra: string;           // ISO Date
  mediaIntervaloDias: number;     // média de dias entre compras
  gastoTotal: number;             // soma de precoTotal
  precoMedio: number;             // média de precoUnitario
  precoMinimo: number;            // menor preço registrado (Correção 7)
  precoMaximo: number;            // maior preço registrado (Correção 7)
  ultimoLocal?: string;           // último local de compra (Correção 7)
  locaisFrequentes: string[];     // locais mais usados (Correção 7)
  evolucaoPrecos: number[];       // sequência de preços
  classificacao: ConsumoClassificacao;
  selos: Selo[];
}

export type ConsumoClassificacao =
  | 'Consumo Muito Alto'
  | 'Consumo Alto'
  | 'Consumo Médio'
  | 'Consumo Baixo'
  | 'Consumo Raro';

export type Selo = '🔥' | '⭐' | '📈' | '💰';

export interface ArchivedList {
  date: string;
  items: Item[];
}

export enum FilterType {
  TODOS = 'Todos',
  PENDENTES = 'Pendentes',
  COMPRADOS = 'Comprados'
}

export enum AppView {
  LISTA = 'LISTA',
  HISTORICO = 'HISTORICO',
  INSIGHTS = 'INSIGHTS',
  COMPARTILHAR = 'COMPARTILHAR',
  COMPRAS = 'COMPRAS',
  DASHBOARD = 'DASHBOARD',
}

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  nomeCasal: string;    // display name / nome do casal
  createdAt: string;
}

export interface Session {
  user: User;
  accessToken: string;
  expiresAt: number;    // timestamp em ms
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User; session: Session }
  | { status: 'unauthenticated' };

