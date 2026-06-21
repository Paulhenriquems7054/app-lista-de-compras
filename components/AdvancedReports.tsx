import React, { useState, useMemo } from 'react';
import { PurchaseHistory, PurchaseRecord } from '../types';

interface AdvancedReportsProps {
  purchaseHistory: PurchaseHistory[];
  showButton?: boolean;
}

type Period = '7d' | '30d' | '90d' | '1y' | 'all';
type ReportTab = 'spending' | 'categories' | 'trends' | 'frequency';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '1y': 'Último ano',
  'all': 'Todo o período',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const AdvancedReports: React.FC<AdvancedReportsProps> = ({
  purchaseHistory,
  showButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');
  const [tab, setTab] = useState<ReportTab>('spending');

  // ── Filtra sessões pelo período ──────────────────────────────────────────
  const sessions = useMemo(() => {
    const now = Date.now();
    const ms: Record<Period, number> = {
      '7d':  7   * 86_400_000,
      '30d': 30  * 86_400_000,
      '90d': 90  * 86_400_000,
      '1y':  365 * 86_400_000,
      'all': Infinity,
    };
    const cutoff = period === 'all' ? 0 : now - ms[period];
    return purchaseHistory.filter(s => new Date(s.data).getTime() >= cutoff);
  }, [purchaseHistory, period]);

  // todos os registros do período
  const records = useMemo<PurchaseRecord[]>(
    () => sessions.flatMap(s => s.itens),
    [sessions],
  );

  // ── Relatório de Gastos ──────────────────────────────────────────────────
  const spending = useMemo(() => {
    const totalSessions = sessions.length;
    const totalItens    = records.length;
    const totalGasto    = sessions.reduce((s, h) => s + h.valorTotal, 0);
    const mediaCompra   = totalSessions > 0 ? totalGasto / totalSessions : 0;

    // Gasto por mês (últimas sessões agrupadas)
    const byMonth: Record<string, number> = {};
    sessions.forEach(s => {
      const key = new Date(s.data).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      byMonth[key] = (byMonth[key] ?? 0) + s.valorTotal;
    });
    const meses = Object.entries(byMonth).slice(-6);

    return { totalSessions, totalItens, totalGasto, mediaCompra, meses };
  }, [sessions, records]);

  // ── Relatório por Categorias ─────────────────────────────────────────────
  const categories = useMemo(() => {
    const map: Record<string, { count: number; gasto: number }> = {};
    records.forEach(r => {
      if (!map[r.categoria]) map[r.categoria] = { count: 0, gasto: 0 };
      map[r.categoria].count++;
      map[r.categoria].gasto += r.precoUnitario ?? 0;
    });
    const total = Object.values(map).reduce((s, v) => s + v.gasto, 0);
    return Object.entries(map)
      .map(([cat, v]) => ({ cat, ...v, pct: total > 0 ? (v.gasto / total) * 100 : 0 }))
      .sort((a, b) => b.gasto - a.gasto);
  }, [records]);

  // ── Relatório de Tendências (por sessão) ─────────────────────────────────
  const trends = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(-12)
      .map(s => ({
        label: formatDate(s.data),
        itens: s.totalItens,
        gasto: s.valorTotal,
      }));
  }, [sessions]);

  // ── Relatório de Frequência (top itens) ──────────────────────────────────
  const frequency = useMemo(() => {
    const map: Record<string, { count: number; precos: number[]; categoria: string }> = {};
    records.forEach(r => {
      const key = r.itemNome.trim().toLowerCase();
      if (!map[key]) map[key] = { count: 0, precos: [], categoria: r.categoria };
      map[key].count++;
      if (r.precoUnitario) map[key].precos.push(r.precoUnitario);
    });
    return Object.entries(map)
      .map(([nome, v]) => ({
        nome,
        categoria: v.categoria,
        count: v.count,
        precoMedio: v.precos.length > 0 ? v.precos.reduce((a, b) => a + b, 0) / v.precos.length : null,
        precoMin: v.precos.length > 0 ? Math.min(...v.precos) : null,
        precoMax: v.precos.length > 0 ? Math.max(...v.precos) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [records]);

  const maxTrend = useMemo(() => Math.max(...trends.map(t => t.gasto), 1), [trends]);

  if (!isOpen) {
    return showButton ? (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-xs md:text-sm w-full"
      >
        <span>📊</span>
        <span className="font-medium">Relatórios</span>
      </button>
    ) : null;
  }

  const hasData = records.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-dark-gray dark:text-white">📊 Relatórios</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* ── Controles ── */}
        <div className="flex flex-wrap gap-3 px-5 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Período</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
              className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex items-end gap-1 flex-wrap">
            {([
              ['spending',   '💰 Gastos'],
              ['categories', '📂 Categorias'],
              ['trends',     '📈 Tendências'],
              ['frequency',  '🔄 Frequência'],
            ] as [ReportTab, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  tab === v
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Conteúdo ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {!hasData ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p className="font-medium">Nenhum dado no período selecionado.</p>
              <p className="text-sm mt-1">Finalize compras para gerar relatórios.</p>
            </div>
          ) : (
            <>
              {/* ── GASTOS ── */}
              {tab === 'spending' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total gasto',     value: formatCurrency(spending.totalGasto),   bg: 'bg-indigo-50 dark:bg-indigo-900/30',  text: 'text-indigo-700 dark:text-indigo-300' },
                      { label: 'Média por compra', value: formatCurrency(spending.mediaCompra),  bg: 'bg-green-50 dark:bg-green-900/30',    text: 'text-green-700 dark:text-green-300' },
                      { label: 'Compras realizadas', value: String(spending.totalSessions),      bg: 'bg-blue-50 dark:bg-blue-900/30',      text: 'text-blue-700 dark:text-blue-300' },
                      { label: 'Itens comprados',  value: String(spending.totalItens),           bg: 'bg-purple-50 dark:bg-purple-900/30',  text: 'text-purple-700 dark:text-purple-300' },
                    ].map(c => (
                      <div key={c.label} className={`${c.bg} rounded-xl p-3`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                        <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Gasto por mês */}
                  {spending.meses.length > 0 && (
                    <div className="border dark:border-gray-700 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Gasto por mês</h4>
                      <div className="space-y-2">
                        {spending.meses.map(([mes, val]) => {
                          const maxVal = Math.max(...spending.meses.map(([, v]) => v), 1);
                          return (
                            <div key={mes} className="flex items-center gap-3 text-sm">
                              <span className="w-16 text-gray-500 dark:text-gray-400 text-xs">{mes}</span>
                              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-indigo-500 h-2 rounded-full transition-all"
                                  style={{ width: `${(val / maxVal) * 100}%` }}
                                />
                              </div>
                              <span className="w-20 text-right font-semibold text-indigo-600 dark:text-indigo-400 text-xs">
                                {formatCurrency(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CATEGORIAS ── */}
              {tab === 'categories' && (
                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Nenhum dado de categoria disponível.</p>
                  ) : categories.map(c => (
                    <div key={c.cat} className="border dark:border-gray-700 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm text-dark-gray dark:text-white">{c.cat}</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                          {formatCurrency(c.gasto)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{c.pct.toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.count} {c.count === 1 ? 'item' : 'itens'} · Média: {formatCurrency(c.count > 0 ? c.gasto / c.count : 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TENDÊNCIAS ── */}
              {tab === 'trends' && (
                <div className="space-y-3">
                  {trends.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Dados insuficientes para análise de tendências.</p>
                  ) : (
                    <>
                      <div className="border dark:border-gray-700 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
                          Gasto por compra (últimas {trends.length})
                        </h4>
                        <div className="space-y-2">
                          {trends.map(t => (
                            <div key={t.label} className="flex items-center gap-3 text-sm">
                              <span className="w-24 text-gray-500 dark:text-gray-400 text-xs shrink-0">{t.label}</span>
                              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all"
                                  style={{ width: `${(t.gasto / maxTrend) * 100}%` }}
                                />
                              </div>
                              <span className="w-20 text-right text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
                                {t.gasto > 0 ? formatCurrency(t.gasto) : `${t.itens} itens`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── FREQUÊNCIA ── */}
              {tab === 'frequency' && (
                <div className="space-y-2">
                  {frequency.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Dados insuficientes para análise de frequência.</p>
                  ) : (
                    <div className="border dark:border-gray-700 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                          <tr>
                            <th className="text-left px-4 py-2">Produto</th>
                            <th className="text-center px-3 py-2">Vezes</th>
                            <th className="text-right px-4 py-2">Preço médio</th>
                            <th className="text-right px-4 py-2 hidden md:table-cell">Min / Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {frequency.map((f, i) => (
                            <tr key={f.nome} className={`border-t dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/40'}`}>
                              <td className="px-4 py-2.5">
                                <p className="font-medium capitalize text-dark-gray dark:text-white">{f.nome}</p>
                                <p className="text-xs text-gray-400">{f.categoria}</p>
                              </td>
                              <td className="text-center px-3 py-2">
                                <span className="inline-block bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5 text-xs font-semibold">
                                  {f.count}x
                                </span>
                              </td>
                              <td className="text-right px-4 py-2 font-semibold text-mint-dark dark:text-mint text-xs">
                                {f.precoMedio != null ? formatCurrency(f.precoMedio) : '—'}
                              </td>
                              <td className="text-right px-4 py-2 text-xs text-gray-400 hidden md:table-cell">
                                {f.precoMin != null ? `${formatCurrency(f.precoMin)} / ${formatCurrency(f.precoMax!)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer resumo ── */}
        <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Período: <strong>{PERIOD_LABELS[period]}</strong></span>
          <span>Compras: <strong>{spending.totalSessions}</strong></span>
          <span>Itens: <strong>{spending.totalItens}</strong></span>
          <span>Total: <strong className="text-green-600 dark:text-green-400">{formatCurrency(spending.totalGasto)}</strong></span>
        </div>

      </div>
    </div>
  );
};
