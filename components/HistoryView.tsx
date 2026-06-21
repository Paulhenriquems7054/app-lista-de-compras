import React, { useState } from 'react';
import { PurchaseHistory } from '../types';

interface HistoryViewProps {
  history: PurchaseHistory[];
  onBack: () => void;
  onRepeatList?: (historyId: string) => void;
  onDeleteHistory?: (historyId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack, onDeleteHistory }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-mint hover:bg-mint-dark text-white rounded-lg transition-colors"
        >
          <span>←</span>
          <span>Voltar</span>
        </button>
        <h1 className="text-2xl font-bold text-dark-gray dark:text-white">📚 Histórico de Compras</h1>
      </div>

      {sortedHistory.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-medium text-lg">Nenhuma compra finalizada ainda.</p>
          <p className="text-sm mt-1">Finalize uma compra no Modo Compras para ver o histórico aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedHistory.map((entry, index) => {
            const isExpanded = expandedId === entry.id;
            const numero = sortedHistory.length - index;
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                {/* Cabeçalho da compra */}
                <div className="flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Área clicável para expandir */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="flex-1 flex items-center justify-between text-left min-w-0"
                  >
                    <div>
                      <p className="font-bold text-dark-gray dark:text-white">
                        🛒 Compra #{numero}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(entry.data)} às {formatTime(entry.data)}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-mint/20 text-mint-dark dark:text-mint rounded-full px-2 py-0.5 font-medium">
                          {entry.totalItens} {entry.totalItens === 1 ? 'item' : 'itens'}
                        </span>
                        {entry.valorTotal > 0 && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5 font-medium">
                            R$ {entry.valorTotal.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400 text-lg transition-transform duration-200 mx-3 flex-shrink-0" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>

                  {/* Botão excluir sempre visível */}
                  {onDeleteHistory && (
                    confirmDeleteId === entry.id ? (
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Excluir?</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { onDeleteHistory(entry.id); setConfirmDeleteId(null); setExpandedId(null); }}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        className="flex-shrink-0 ml-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir esta compra"
                        aria-label="Excluir esta compra"
                      >
                        🗑️
                      </button>
                    )
                  )}
                </div>

                {/* Detalhes dos itens */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {/* Cabeçalho da tabela */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      <span className="col-span-4">Produto</span>
                      <span className="col-span-2 text-center">Qtd.</span>
                      <span className="col-span-2 text-right">Preço</span>
                      <span className="col-span-4 text-right">Local / Obs.</span>
                    </div>

                    {entry.itens.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-gray-50 dark:border-gray-700/50 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <div className="col-span-4">
                          <p className="font-medium text-sm text-dark-gray dark:text-white capitalize">
                            {item.itemNome}
                          </p>
                          <p className="text-xs text-gray-400">{item.categoria}</p>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{item.quantidade}</span>
                        </div>
                        <div className="col-span-2 text-right">
                          {item.precoUnitario != null ? (
                            <span className="text-sm font-semibold text-mint-dark dark:text-mint">
                              R$ {item.precoUnitario.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                        <div className="col-span-4 text-right space-y-0.5">
                          {item.localCompra && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              📍 {item.localCompra}
                            </p>
                          )}
                          {item.observacao && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                              💬 {item.observacao}
                            </p>
                          )}
                          {!item.localCompra && !item.observacao && (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Rodapé com total */}
                    {entry.valorTotal > 0 && (
                      <div className="flex justify-end items-center px-4 py-3 bg-green-50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-800">
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">
                          Total: R$ {entry.valorTotal.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
