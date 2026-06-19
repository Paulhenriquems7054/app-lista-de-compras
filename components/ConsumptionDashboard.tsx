import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ProductStats, ConsumoClassificacao } from '../types';
import { ConsumptionStats, SugestaoItem } from '../hooks/useConsumptionStats';

interface ConsumptionDashboardProps {
  stats: ConsumptionStats;
  onBack: () => void;
}

const COLORS = ['#A8E6CF','#87D8B9','#4ECDC4','#3AB0A8','#FF6B6B','#FFE66D','#A78BFA','#34D399','#F97316'];

const classColor: Record<ConsumoClassificacao, string> = {
  'Consumo Muito Alto': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Consumo Alto':       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Consumo Médio':      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Consumo Baixo':      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Consumo Raro':       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

type Tab = 'resumo' | 'produtos' | 'categorias' | 'meses' | 'sugestoes';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function StatCard({ label, value, sub, color = 'mint' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold text-${color}-dark dark:text-${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const ProductRow = React.memo(function ProductRow({ p, rank }: { p: ProductStats; rank?: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
      {rank !== undefined && (
        <span className="w-6 text-center text-sm font-bold text-gray-400">{rank + 1}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold text-sm capitalize truncate">{p.nome}</span>
          {p.selos.map(s => (
            <span key={s} title={seloTitle(s)} className="text-base leading-none">{s}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${classColor[p.classificacao]}`}>
            {p.classificacao}
          </span>
          <span className="text-xs text-gray-500">{p.categoria}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-mint-dark">{p.totalCompras}x</p>
        {p.gastoTotal > 0 && <p className="text-xs text-gray-500">{fmt(p.gastoTotal)}</p>}
        {p.mediaIntervaloDias > 0 && (
          <p className="text-xs text-gray-400">~{Math.round(p.mediaIntervaloDias)}d</p>
        )}
      </div>
    </div>
  );
});

function seloTitle(s: string): string {
  switch (s) {
    case '🔥': return 'Item mais consumido';
    case '⭐': return 'Item recorrente';
    case '📈': return 'Preço em alta';
    case '💰': return 'Maior gasto acumulado';
    default: return '';
  }
}

const SugestaoCard = React.memo(function SugestaoCard({ s }: { s: SugestaoItem }) {
  const urgColor = s.urgencia === 'alta'
    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
    : s.urgencia === 'media'
    ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700'
    : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700';
  const badge = s.urgencia === 'alta' ? '🔴' : s.urgencia === 'media' ? '🟡' : '🟢';

  return (
    <div className={`border rounded-xl p-4 ${urgColor}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg mt-0.5">{badge}</span>
        <div>
          <p className="font-semibold capitalize">{s.nome}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.motivo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Categoria: {s.categoria} • Intervalo médio: {s.mediaIntervalo} dias
          </p>
        </div>
      </div>
    </div>
  );
});

export const ConsumptionDashboard: React.FC<ConsumptionDashboardProps> = ({ stats, onBack }) => {
  const [tab, setTab] = useState<Tab>('resumo');

  const noData = stats.productStats.length === 0;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'resumo',     label: 'Resumo',     icon: '📊' },
    { key: 'produtos',   label: 'Produtos',   icon: '🛍️' },
    { key: 'categorias', label: 'Categorias', icon: '📂' },
    { key: 'meses',      label: 'Meses',      icon: '📅' },
    { key: 'sugestoes',  label: 'Sugestões',  icon: '💡' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-2 bg-mint hover:bg-mint-dark text-white rounded-lg text-sm transition-colors"
        >
          ← Voltar
        </button>
        <div>
          <h2 className="text-xl font-bold">Dashboard de Consumo</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.productStats.length} produtos • {stats.gastoPorMes.reduce((s, m) => s + m.compras, 0)} registros
          </p>
          {stats.registrosDescartados > 0 && (
            <p className="text-xs text-orange-500 mt-0.5">
              ⚠️ {stats.registrosDescartados} registro{stats.registrosDescartados > 1 ? 's' : ''} corrompido{stats.registrosDescartados > 1 ? 's' : ''} ignorado{stats.registrosDescartados > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {noData ? (
        <div className="text-center py-16 bg-white dark:bg-dark-card rounded-xl shadow-sm">
          <p className="text-5xl mb-3">📊</p>
          <h3 className="font-bold text-lg mb-2">Sem dados ainda</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Adicione itens à lista, marque como comprados e arquive a lista. O dashboard será preenchido automaticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  tab === t.key
                    ? 'bg-mint-dark text-white'
                    : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.key === 'sugestoes' && stats.sugestoes.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {stats.sugestoes.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Resumo ─────────────────────────────────────────────── */}
          {tab === 'resumo' && (
            <div className="space-y-4">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Gasto Histórico Total"
                  value={fmt(stats.totalGastoHistorico)}
                  sub="todos os períodos"
                />
                <StatCard
                  label="Produtos Monitorados"
                  value={String(stats.productStats.length)}
                  sub="produtos únicos"
                />
                <StatCard
                  label="Mais Comprado"
                  value={stats.top10MaisComprados[0]?.totalCompras
                    ? `${stats.top10MaisComprados[0].totalCompras}x`
                    : '—'}
                  sub={stats.top10MaisComprados[0]?.nome ?? ''}
                />
                <StatCard
                  label="Sugestões Hoje"
                  value={String(stats.sugestoes.length)}
                  sub="itens a reabastecer"
                />
              </div>

              {/* Selos legenda */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                <p className="text-sm font-semibold mb-3">Legenda dos Selos</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {[
                    { selo: '🔥', desc: 'Item mais consumido (top 20% em frequência)' },
                    { selo: '⭐', desc: 'Item recorrente (comprado toda semana)' },
                    { selo: '📈', desc: 'Preço em alta (subiu ≥10% na última compra)' },
                    { selo: '💰', desc: 'Maior gasto acumulado (top 20%)' },
                  ].map(({ selo, desc }) => (
                    <div key={selo} className="flex items-start gap-2">
                      <span className="text-xl">{selo}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maiores aumentos de preço */}
              {stats.maioresAumentos.length > 0 && (
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                  <p className="text-sm font-semibold mb-3">📈 Maiores Aumentos de Preço</p>
                  <div className="space-y-2">
                    {stats.maioresAumentos.map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="capitalize font-medium">{a.nome}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 line-through">{fmt(a.de)}</span>
                          <span className="font-semibold">{fmt(a.para)}</span>
                          <span className="text-red-500 font-bold text-xs">
                            +{(a.variacao * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Produtos ───────────────────────────────────────────── */}
          {tab === 'produtos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top 10 mais comprados */}
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                  <p className="text-sm font-semibold mb-3">🏆 Top 10 Mais Comprados</p>
                  <div className="space-y-2">
                    {stats.top10MaisComprados.map((p, i) => (
                      <ProductRow key={p.nome} p={p} rank={i} />
                    ))}
                    {stats.top10MaisComprados.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Sem dados suficientes</p>
                    )}
                  </div>
                </div>

                {/* Top 10 maior gasto */}
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                  <p className="text-sm font-semibold mb-3">💰 Top 10 Maior Gasto</p>
                  <div className="space-y-2">
                    {stats.top10MaiorGasto.map((p, i) => (
                      <ProductRow key={p.nome} p={p} rank={i} />
                    ))}
                    {stats.top10MaiorGasto.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Cadastre preços para ver este ranking</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Todos os produtos com classificação */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                <p className="text-sm font-semibold mb-3">Todos os Produtos</p>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {stats.productStats
                    .sort((a, b) => b.totalCompras - a.totalCompras)
                    .map(p => <ProductRow key={p.nome} p={p} />)}
                </div>
              </div>
            </div>
          )}

          {/* ── Categorias ─────────────────────────────────────────── */}
          {tab === 'categorias' && (
            <div className="space-y-4">
              {stats.gastoPorCategoria.some(c => c.total > 0) ? (
                <>
                  {/* Gráfico Pizza */}
                  <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                    <p className="text-sm font-semibold mb-3">Distribuição de Gastos</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={stats.gastoPorCategoria.filter(c => c.total > 0)}
                          dataKey="total"
                          nameKey="categoria"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ categoria, percent }) =>
                            `${categoria.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {stats.gastoPorCategoria.filter(c => c.total > 0).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista detalhada */}
                  <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                    <p className="text-sm font-semibold mb-3">Detalhamento por Categoria</p>
                    <div className="space-y-3">
                      {stats.gastoPorCategoria.map((c, i) => {
                        const total = stats.totalGastoHistorico;
                        const pct = total > 0 ? (c.total / total) * 100 : 0;
                        return (
                          <div key={c.categoria}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{c.categoria}</span>
                              <span className="font-bold">{fmt(c.total)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{c.count} compras</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                  <p className="text-sm font-semibold mb-3">Frequência por Categoria</p>
                  <div className="space-y-3">
                    {stats.gastoPorCategoria.map(c => (
                      <div key={c.categoria} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{c.categoria}</span>
                        <span className="text-mint-dark font-semibold">{c.count} compras</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    Cadastre preços nos itens para ver gastos por categoria
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Meses ──────────────────────────────────────────────── */}
          {tab === 'meses' && (
            <div className="space-y-4">
              {stats.gastoPorMes.length > 0 ? (
                <>
                  {/* Gráfico barras gastos mensais */}
                  {stats.gastoPorMes.some(m => m.total > 0) && (
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                      <p className="text-sm font-semibold mb-3">Gasto Mensal (R$)</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={stats.gastoPorMes}>
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="total" fill="#87D8B9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Gráfico linha compras mensais */}
                  <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                    <p className="text-sm font-semibold mb-3">Compras por Mês (itens)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={stats.gastoPorMes}>
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="compras"
                          stroke="#4ECDC4"
                          strokeWidth={2}
                          dot={{ fill: '#4ECDC4', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela mensal */}
                  <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
                    <p className="text-sm font-semibold mb-3">Detalhamento Mensal</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                            <th className="pb-2">Mês</th>
                            <th className="pb-2 text-right">Compras</th>
                            <th className="pb-2 text-right">Gasto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {[...stats.gastoPorMes].reverse().map(m => (
                            <tr key={m.mes}>
                              <td className="py-2 font-medium capitalize">{m.label}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{m.compras}</td>
                              <td className="py-2 text-right font-semibold text-mint-dark">
                                {m.total > 0 ? fmt(m.total) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">📅</p>
                  <p>Sem dados mensais ainda</p>
                </div>
              )}
            </div>
          )}

          {/* ── Sugestões ──────────────────────────────────────────── */}
          {tab === 'sugestoes' && (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Como funcionam as sugestões?</p>
                <p>O app analisa seu histórico e sugere itens quando você está próximo (80%+) ou passou do intervalo médio entre compras.</p>
              </div>
              {stats.sugestoes.length > 0 ? (
                stats.sugestoes.map((s) => <SugestaoCard key={`${s.nome}-${s.ultimaCompra}`} s={s} />)
              ) : (
                <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl shadow-sm">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="font-semibold">Nada urgente no momento</p>
                  <p className="text-sm text-gray-500 mt-1">
                    As sugestões aparecem quando itens recorrentes estão próximos do prazo.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
