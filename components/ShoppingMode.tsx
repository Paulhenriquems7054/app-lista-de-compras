import React, { useMemo, useState } from 'react';
import { Item } from '../types';

interface ShoppingModeProps {
  items: Item[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: Item) => void;
  onFinalize: () => void;
  onExit: () => void;
}

export const ShoppingMode: React.FC<ShoppingModeProps> = ({
  items,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onFinalize,
  onExit,
}) => {
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  // id do item aguardando confirmação de exclusão
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    items.forEach(item => {
      if (!map[item.categoria]) map[item.categoria] = [];
      map[item.categoria].push(item);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => {
        const pendA = a.filter(i => !i.comprado).length;
        const pendB = b.filter(i => !i.comprado).length;
        return pendB - pendA;
      })
      .map(([categoria, itens]) => ({
        categoria,
        itens: [...itens].sort((a, b) => Number(a.comprado) - Number(b.comprado)),
      }));
  }, [items]);

  const total     = items.length;
  const comprados = items.filter(i => i.comprado).length;
  const progresso = total > 0 ? (comprados / total) * 100 : 0;

  const totalEstimado = useMemo(
    () => items
      .filter(i => !i.comprado && (i.precoUnitario || i.preco_medio))
      .reduce((s, i) => s + (i.precoUnitario ?? i.preco_medio ?? 0), 0),
    [items],
  );
  const totalGasto = useMemo(
    () => items
      .filter(i => i.comprado && (i.precoUnitario || i.preco_medio))
      .reduce((s, i) => s + (i.precoUnitario ?? i.preco_medio ?? 0), 0),
    [items],
  );

  const handleToggle = (id: string) => {
    setLastChecked(id);
    onToggleItem(id);
    setTimeout(() => setLastChecked(null), 600);
  };

  const handleDeleteConfirm = (id: string) => {
    onDeleteItem(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-dark-card shadow-md px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-dark-gray dark:text-white">🛒 Modo Compras</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {comprados} de {total} itens marcados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {comprados > 0 && (
              <button
                onClick={onFinalize}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-sm"
                title="Finalizar compras e salvar no histórico"
              >
                ✓ Finalizar
              </button>
            )}
            <button
              onClick={onExit}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              ✕ Sair
            </button>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-mint-dark transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Totais financeiros */}
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          {totalGasto > 0 && (
            <span className="text-green-600 dark:text-green-400 font-semibold">
              Gasto: R$ {totalGasto.toFixed(2)}
            </span>
          )}
          {totalEstimado > 0 && (
            <span className="ml-auto">
              Restante: R$ {totalEstimado.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* ── Lista agrupada por categoria ─────────────────────────────────── */}
      <div className="flex-1 px-3 py-4 space-y-5 pb-24">
        {items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🛒</div>
            <p className="font-medium">Lista vazia</p>
            <p className="text-sm">Adicione itens antes de ir às compras</p>
          </div>
        )}

        {grouped.map(({ categoria, itens }) => {
          const pendentes = itens.filter(i => !i.comprado).length;
          const concluido = pendentes === 0;

          return (
            <div
              key={categoria}
              className={`rounded-xl overflow-hidden shadow-sm transition-opacity ${concluido ? 'opacity-60' : ''}`}
            >
              {/* Cabeçalho da categoria */}
              <div className={`px-4 py-2 flex items-center justify-between ${
                concluido ? 'bg-gray-200 dark:bg-gray-700' : 'bg-mint dark:bg-mint-dark'
              }`}>
                <span className={`font-bold text-sm ${
                  concluido ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-white'
                }`}>
                  {categoria}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  concluido
                    ? 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    : 'bg-white/30 text-white'
                }`}>
                  {concluido ? '✓ Concluído' : `${pendentes} pendente${pendentes !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Itens */}
              <div className="bg-white dark:bg-dark-card divide-y divide-gray-100 dark:divide-gray-700">
                {itens.map(item => {
                  const isJustChecked = lastChecked === item.id;
                  const awaitingDelete = confirmDeleteId === item.id;

                  return (
                    <div key={item.id}>
                      {/* ── Linha principal ──────────────────────────── */}
                      <div
                        className={`flex items-center gap-2 px-3 py-3 transition-colors ${
                          item.comprado
                            ? 'bg-gray-50 dark:bg-gray-800/50'
                            : isJustChecked
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'hover:bg-mint/5 dark:hover:bg-mint/10'
                        }`}
                      >
                        {/* Área clicável: toggle comprado */}
                        <button
                          onClick={() => handleToggle(item.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform"
                          aria-label={item.comprado ? `Desmarcar ${item.nome}` : `Marcar ${item.nome} como comprado`}
                        >
                          {/* Círculo de marcação — reflete item.comprado */}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            item.comprado
                              ? 'bg-mint-dark border-mint-dark'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {item.comprado && (
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Nome e detalhes */}
                          <div className="flex-1 min-w-0">
                            {/* CORREÇÃO PROBLEMA 2: line-through só quando comprado */}
                            <p className={`text-base font-semibold truncate ${
                              item.comprado
                                ? 'line-through text-gray-400 dark:text-gray-500'
                                : 'text-dark-gray dark:text-white'
                            }`}>
                              {item.nome}
                            </p>
                            {item.quantidade && (
                              <p className={`text-sm ${item.comprado ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {item.quantidade}
                              </p>
                            )}
                            {item.localCompra && (
                              <p className={`text-xs ${item.comprado ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                📍 {item.localCompra}
                              </p>
                            )}
                            {item.observacao && (
                              <p className={`text-xs italic ${item.comprado ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                💬 {item.observacao}
                              </p>
                            )}
                          </div>

                          {/* Preço */}
                          {(item.precoUnitario != null || item.preco_medio != null) && (
                            <span className={`flex-shrink-0 text-sm font-semibold ${
                              item.comprado ? 'text-gray-400 line-through' : 'text-mint-dark'
                            }`}>
                              R$ {(item.precoUnitario ?? item.preco_medio)!.toFixed(2)}
                            </span>
                          )}
                        </button>

                        {/* ── Botão Editar (PROBLEMA 3) ── */}
                        <button
                          onClick={() => onEditItem(item)}
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-500 active:scale-90 transition-all"
                          title={`Editar ${item.nome}`}
                          aria-label={`Editar ${item.nome}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>

                        {/* ── Botão Excluir (PROBLEMA 4) ── */}
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 active:scale-90 transition-all"
                          title={`Excluir ${item.nome}`}
                          aria-label={`Excluir ${item.nome}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>

                      {/* ── Confirmação de exclusão inline (PROBLEMA 4) ── */}
                      {awaitingDelete && (
                        <div className="mx-3 mb-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                          <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                            Excluir "{item.nome}"?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteConfirm(item.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Excluir
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Banner de conclusão ──────────────────────────────────────────── */}
      {total > 0 && comprados === total && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-500 text-white text-center py-4 shadow-xl z-30">
          <p className="font-bold text-lg mb-2 animate-bounce">🎉 Todos os itens marcados!</p>
          <button
            onClick={onFinalize}
            className="px-8 py-2 bg-white text-green-600 font-bold rounded-full shadow hover:bg-green-50 transition-colors text-base"
          >
            ✓ Finalizar Compras
          </button>
        </div>
      )}
    </div>
  );
};
