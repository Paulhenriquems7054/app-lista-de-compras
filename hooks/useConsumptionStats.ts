import { useMemo } from 'react';
import {
  PurchaseRecord,
  ProductStats,
  ConsumoClassificacao,
  Selo,
  Category,
} from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── Helpers com validação ───────────────────────────────────────────────────

/** Retorna true se a string representa uma data ISO válida e não futura-absurda */
function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string' || s.length < 10) return false;
  const t = new Date(s).getTime();
  return !isNaN(t) && t > 0;
}

/** Dias entre duas datas ISO válidas. Retorna null se qualquer data for inválida. */
function daysBetween(a: string, b: string): number | null {
  if (!isValidISODate(a) || !isValidISODate(b)) return null;
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY;
  return Math.abs(diff);
}

function normalizeName(nome: unknown): string {
  if (typeof nome !== 'string') return 'desconhecido';
  return nome.trim().toLowerCase() || 'desconhecido';
}

/**
 * Valida e sanitiza um PurchaseRecord vindo do localStorage.
 * Retorna null se o registro for irrecuperável.
 */
function sanitizeRecord(r: unknown): PurchaseRecord | null {
  if (!r || typeof r !== 'object') return null;
  const rec = r as Record<string, unknown>;

  if (!isValidISODate(rec.dataCompra)) return null;

  const nome = normalizeName(rec.itemNome);
  if (nome === 'desconhecido' && !rec.itemNome) return null;

  // categoria: fallback para OUTROS se ausente/inválida
  const categoria = (typeof rec.categoria === 'string' && rec.categoria.length > 0)
    ? (rec.categoria as Category)
    : Category.OUTROS;

  // preços: só aceitar números finitos e positivos
  const precoUnitario =
    typeof rec.precoUnitario === 'number' && isFinite(rec.precoUnitario) && rec.precoUnitario > 0
      ? rec.precoUnitario
      : undefined;

  const precoTotal =
    typeof rec.precoTotal === 'number' && isFinite(rec.precoTotal) && rec.precoTotal > 0
      ? rec.precoTotal
      : undefined;

  return {
    id: typeof rec.id === 'string' ? rec.id : `r-${Date.now()}-${Math.random()}`,
    itemNome: nome,
    categoria,
    quantidade: typeof rec.quantidade === 'string' ? rec.quantidade : '1',
    precoUnitario,
    precoTotal,
    dataCompra: rec.dataCompra as string,
  };
}

// ─── Classificação ───────────────────────────────────────────────────────────

function classify(
  totalCompras: number,
  frequenciaMensal: number,
): ConsumoClassificacao {
  if (frequenciaMensal >= 4 || totalCompras >= 20) return 'Consumo Muito Alto';
  if (frequenciaMensal >= 2 || totalCompras >= 8)  return 'Consumo Alto';
  if (frequenciaMensal >= 1 || totalCompras >= 4)  return 'Consumo Médio';
  if (totalCompras >= 2)                            return 'Consumo Baixo';
  return 'Consumo Raro';
}

// ─── Selos — O(n log n) pré-computado ────────────────────────────────────────

function buildSelosForAll(
  stats: Omit<ProductStats, 'selos'>[],
): Map<string, Selo[]> {
  const result = new Map<string, Selo[]>();
  if (stats.length === 0) return result;

  // pré-ordenar uma vez cada ranking
  const byFreq  = [...stats].sort((a, b) => b.frequenciaMensalMedia - a.frequenciaMensalMedia);
  const byGasto = [...stats].sort((a, b) => b.gastoTotal - a.gastoTotal);

  const top20freq  = new Set(byFreq.slice(0, Math.max(1, Math.ceil(stats.length * 0.2))).map(s => s.nome));
  const top20gasto = new Set(byGasto.slice(0, Math.max(1, Math.ceil(stats.length * 0.2))).map(s => s.nome));

  for (const s of stats) {
    const selos: Selo[] = [];

    if (top20freq.has(s.nome))  selos.push('🔥');
    if (s.frequenciaMensalMedia >= 0.75) selos.push('⭐');

    // 📈 Preço subiu ≥ 10% nos últimos 2 registros válidos
    if (s.evolucaoPrecos.length >= 2) {
      const last = s.evolucaoPrecos[s.evolucaoPrecos.length - 1];
      const prev = s.evolucaoPrecos[s.evolucaoPrecos.length - 2];
      if (prev > 0 && isFinite(last / prev) && (last - prev) / prev >= 0.1) {
        selos.push('📈');
      }
    }

    if (top20gasto.has(s.nome)) selos.push('💰');

    result.set(s.nome, selos);
  }

  return result;
}

// ─── Interfaces públicas ─────────────────────────────────────────────────────

export interface ConsumptionStats {
  productStats: ProductStats[];
  top10MaisComprados: ProductStats[];
  top10MaiorGasto: ProductStats[];
  gastoPorCategoria: { categoria: string; total: number; count: number }[];
  gastoPorMes: { mes: string; label: string; total: number; compras: number }[];
  totalGastoHistorico: number;
  maioresAumentos: { nome: string; variacao: number; de: number; para: number }[];
  sugestoes: SugestaoItem[];
  /** Quantidade de registros descartados por corrupção */
  registrosDescartados: number;
}

export interface SugestaoItem {
  nome: string;
  categoria: Category;
  motivo: string;
  ultimaCompra: string;
  diasDesde: number;
  mediaIntervalo: number;
  urgencia: 'alta' | 'media' | 'baixa';
}

// ─── Hook principal ──────────────────────────────────────────────────────────

export function useConsumptionStats(
  purchaseHistoryRaw: PurchaseRecord[],
): ConsumptionStats {
  return useMemo(() => {
    if (!Array.isArray(purchaseHistoryRaw) || purchaseHistoryRaw.length === 0) {
      return empty();
    }

    // ── 0. Sanitizar — rejeitar registros corrompidos ───────────────────────
    let descartados = 0;
    const purchaseHistory: PurchaseRecord[] = [];
    for (const raw of purchaseHistoryRaw) {
      const clean = sanitizeRecord(raw);
      if (clean) {
        purchaseHistory.push(clean);
      } else {
        descartados++;
      }
    }

    if (purchaseHistory.length === 0) {
      return { ...empty(), registrosDescartados: descartados };
    }

    // ── 1. Agrupar por produto ──────────────────────────────────────────────
    const byProduct = new Map<string, PurchaseRecord[]>();
    for (const r of purchaseHistory) {
      const key = r.itemNome; // já normalizado pelo sanitize
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key)!.push(r);
    }

    const nowISO = new Date().toISOString();

    // ── 2. Calcular stats por produto (sem selos) ───────────────────────────
    const statsWithoutSelos: Omit<ProductStats, 'selos'>[] = [];

    byProduct.forEach((records) => {
      // Ordenar cronologicamente e deduplicar por (nome + dataCompra com margem de 1h)
      const sorted = [...records].sort(
        (a, b) => new Date(a.dataCompra).getTime() - new Date(b.dataCompra).getTime(),
      );

      // Deduplicar registros arquivados no mesmo instante (margem 3600s)
      const deduped: PurchaseRecord[] = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        const prev = deduped[deduped.length - 1];
        const diffMs = new Date(sorted[i].dataCompra).getTime() - new Date(prev.dataCompra).getTime();
        if (diffMs > 3600 * 1000) {
          deduped.push(sorted[i]);
        }
        // se <= 1h considera mesma sessão de arquivamento — ignora duplicata
      }

      const totalCompras = deduped.length;
      const ultimaCompra = deduped[deduped.length - 1].dataCompra;
      const primeiraCompra = deduped[0].dataCompra;

      // ── Intervalo médio entre compras ───────────────────────────────────
      let mediaIntervaloDias = 0;
      if (deduped.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < deduped.length; i++) {
          const d = daysBetween(deduped[i - 1].dataCompra, deduped[i].dataCompra);
          if (d !== null && d >= 0) intervals.push(d);
        }
        if (intervals.length > 0) {
          mediaIntervaloDias = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        }
      }

      // ── Frequência baseada na janela primeira→última compra ─────────────
      // Usa a janela real de observação (primeira até última), não "até hoje",
      // evitando subinflação para itens que pararam de ser comprados.
      const janelaObsDias = daysBetween(primeiraCompra, ultimaCompra) ?? 0;
      // Janela mínima: se só 1 compra, usar intervalo médio esperado (30d) como fallback
      const janelaMes = Math.max(janelaObsDias, 30) / 30;
      const janelaSemana = Math.max(janelaObsDias, 7) / 7;

      // Para 1 compra: frequência = 1 / (30/30) = 1 compra/mês → "Consumo Médio" é razoável
      const frequenciaMensalMedia  = totalCompras / janelaMes;
      const frequenciaSemanailMedia = totalCompras / janelaSemana;

      // ── Preços ──────────────────────────────────────────────────────────
      const precos = deduped
        .filter(r => r.precoUnitario !== undefined && r.precoUnitario! > 0)
        .map(r => r.precoUnitario!);

      const precoMedio = precos.length > 0
        ? precos.reduce((a, b) => a + b, 0) / precos.length
        : 0;

      const gastoTotal = deduped.reduce((s, r) => s + (r.precoTotal ?? 0), 0);

      statsWithoutSelos.push({
        nome: deduped[0].itemNome,
        categoria: deduped[0].categoria,
        totalCompras,
        quantidadeTotalTexto: `${totalCompras}x`,
        frequenciaMensalMedia,
        frequenciaSemanailMedia,
        ultimaCompra,
        mediaIntervaloDias,
        gastoTotal,
        precoMedio,
        evolucaoPrecos: precos,
        classificacao: classify(totalCompras, frequenciaMensalMedia),
      });
    });

    // ── 3. Selos — O(n log n) ───────────────────────────────────────────────
    const selosMap = buildSelosForAll(statsWithoutSelos);
    const productStats: ProductStats[] = statsWithoutSelos.map(s => ({
      ...s,
      selos: selosMap.get(s.nome) ?? [],
    }));

    // ── 4. Top 10s — shallow copies para não mutar o array original ─────────
    const top10MaisComprados = [...productStats]
      .sort((a, b) => b.totalCompras - a.totalCompras)
      .slice(0, 10);

    const top10MaiorGasto = [...productStats]
      .sort((a, b) => b.gastoTotal - a.gastoTotal)
      .filter(p => p.gastoTotal > 0)
      .slice(0, 10);

    // ── 5. Gasto por categoria ──────────────────────────────────────────────
    const catMap = new Map<string, { total: number; count: number }>();
    for (const r of purchaseHistory) {
      const existing = catMap.get(r.categoria) ?? { total: 0, count: 0 };
      catMap.set(r.categoria, {
        total: existing.total + (r.precoTotal ?? 0),
        count: existing.count + 1,
      });
    }
    const gastoPorCategoria = [...catMap.entries()]
      .map(([categoria, v]) => ({ categoria, ...v }))
      .sort((a, b) => b.total - a.total);

    // ── 6. Gasto por mês ────────────────────────────────────────────────────
    const mesMap = new Map<string, { total: number; compras: number }>();
    for (const r of purchaseHistory) {
      const mes = r.dataCompra.slice(0, 7); // YYYY-MM — já validado
      const existing = mesMap.get(mes) ?? { total: 0, compras: 0 };
      mesMap.set(mes, {
        total: existing.total + (r.precoTotal ?? 0),
        compras: existing.compras + 1,
      });
    }
    const gastoPorMes = [...mesMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => {
        const [year, month] = mes.split('-');
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        });
        return { mes, label, ...v };
      });

    // ── 7. Total histórico ──────────────────────────────────────────────────
    const totalGastoHistorico = purchaseHistory.reduce(
      (s, r) => s + (r.precoTotal ?? 0),
      0,
    );

    // ── 8. Maiores aumentos de preço ────────────────────────────────────────
    const maioresAumentos = productStats
      .filter(p => p.evolucaoPrecos.length >= 2)
      .map(p => {
        const de   = p.evolucaoPrecos[p.evolucaoPrecos.length - 2];
        const para = p.evolucaoPrecos[p.evolucaoPrecos.length - 1];
        if (de <= 0 || !isFinite(para / de)) return null;
        return { nome: p.nome, variacao: (para - de) / de, de, para };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.variacao > 0)
      .sort((a, b) => b.variacao - a.variacao)
      .slice(0, 5);

    // ── 9. Sugestões inteligentes ────────────────────────────────────────────
    const sugestoes: SugestaoItem[] = productStats
      .filter(p => p.mediaIntervaloDias > 0 && isValidISODate(p.ultimaCompra))
      .map(p => {
        const diasDesde = daysBetween(p.ultimaCompra, nowISO);
        if (diasDesde === null) return null;
        const ratio = diasDesde / p.mediaIntervaloDias;
        return { p, diasDesde, ratio };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.ratio >= 0.8)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 8)
      .map(({ p, diasDesde, ratio }) => ({
        nome: p.nome,
        categoria: p.categoria,
        motivo: buildMotivo(p.nome, diasDesde, p.mediaIntervaloDias),
        ultimaCompra: p.ultimaCompra,
        diasDesde: Math.round(diasDesde),
        mediaIntervalo: Math.round(p.mediaIntervaloDias),
        urgencia: (ratio >= 1.1 ? 'alta' : ratio >= 0.9 ? 'media' : 'baixa') as SugestaoItem['urgencia'],
      }));

    return {
      productStats,
      top10MaisComprados,
      top10MaiorGasto,
      gastoPorCategoria,
      gastoPorMes,
      totalGastoHistorico,
      maioresAumentos,
      sugestoes,
      registrosDescartados: descartados,
    };
  }, [purchaseHistoryRaw]);
}

// ─── Helpers de texto ────────────────────────────────────────────────────────

function buildMotivo(nome: string, diasDesde: number, mediaIntervalo: number): string {
  const cap = nome.charAt(0).toUpperCase() + nome.slice(1);
  const med = Math.round(mediaIntervalo);
  const dias = Math.round(diasDesde);
  if (diasDesde > mediaIntervalo) {
    return `${cap} costuma ser comprado a cada ${med} dias. Última compra há ${dias} dias — já passou do prazo.`;
  }
  return `${cap} costuma ser comprado a cada ${med} dias. Última compra há ${dias} dias.`;
}

function empty(): ConsumptionStats {
  return {
    productStats: [],
    top10MaisComprados: [],
    top10MaiorGasto: [],
    gastoPorCategoria: [],
    gastoPorMes: [],
    totalGastoHistorico: 0,
    maioresAumentos: [],
    sugestoes: [],
    registrosDescartados: 0,
  };
}
