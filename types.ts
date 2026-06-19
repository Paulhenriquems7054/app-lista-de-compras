
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
  frequencia: number;
  ultima_compra: string;
  preco_medio?: number;
  historico_precos?: number[];
  dias_entre_compras?: number;
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
}

/** Estatísticas calculadas por produto */
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

