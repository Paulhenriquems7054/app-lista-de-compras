import React, { useMemo, useState } from 'react';
import { Item } from '../types';

interface ShoppingModeProps {
  items: Item[];
  onToggleItem: (id: string) => void;
  onExit: () => void;
}

export const ShoppingMode: React.FC<ShoppingModeProps> = ({ items, onToggleItem, onExit }) => {
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // Agrupar itens por categoria, pendentes primeiro em cada grupo
  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    items.forEach(item => {
      if (!map[item.categoria]) map[item.categoria] = [];
      map[item.categoria].push(item);
    });
    // Ordenar: categorias com pendentes primeiro, depois já concluídas
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

  const total = items.length;
  const comprados = items.filter(i => i.comprado).length;
  const progresso = total > 0 ? (comprados / total) * 100 : 0;

  const totalEstimado = useMemo(
    () => items.filter(i => !i.comprado && i.preco_medio).reduce((s, i) => s + (i.preco_medio || 0), 0),
    [items]
  );
  const totalGasto = useMemo(
    () => items.filter(i => i.comprado && i.preco_medio).reduce((s, i) => s + (i.preco_medio || 0), 0),
    [items]
  );

  const handleToggle = (id: string) => {
    setLastChecked(id);
    onToggleItem(id);
    setTimeout(() => setLastChecked(null), 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">
      {/* Header do modo compras */}
      <div className="sticky top-0 z-20 bg-white dark:bg-dark-card shadow-md px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-dark-gray dark:text-white">🛒 Modo Compras</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {comprados} de {total} itens marcados
            </p>
          </div>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            ✕ Sair
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-mint-dark transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Totais */}
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

      {/* Lista agrupada por categoria */}
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
            <div key={categoria} className={`rounded-xl overflow-hidden shadow-sm ${concluido ? 'opacity-60' : ''}`}>
              {/* Cabeçalho da categoria */}
              <div className={`px-4 py-2 flex items-center justify-between ${concluido ? 'bg-gray-200 dark:bg-gray-700' : 'bg-mint dark:bg-mint-dark'}`}>
                <span className={`font-bold text-sm ${concluido ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-white'}`}>
                  {categoria}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${concluido ? 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300' : 'bg-white/30 text-white'}`}>
                  {concluido ? '✓ Concluído' : `${pendentes} pendente${pendentes !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Itens */}
              <div className="bg-white dark:bg-dark-card divide-y divide-gray-100 dark:divide-gray-700">
                {itens.map(item => {
                  const isJustChecked = lastChecked === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggle(item.id)}
                      className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors active:scale-[0.98] ${
                        item.comprado
                          ? 'bg-gray-50 dark:bg-gray-800/50'
                          : 'hover:bg-mint/5 dark:hover:bg-mint/10'
                      } ${isJustChecked ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                    >
                      {/* Checkbox grande */}
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

                      {/* Nome e quantidade */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-semibold truncate ${item.comprado ? 'line-through text-gray-400 dark:text-gray-500' : 'text-dark-gray dark:text-white'}`}>
                          {item.nome}
                        </p>
                        {item.quantidade && (
                          <p className={`text-sm ${item.comprado ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {item.quantidade}
                          </p>
                        )}
                      </div>

                      {/* Preço */}
                      {item.preco_medio && (
                        <span className={`flex-shrink-0 text-sm font-semibold ${item.comprado ? 'text-gray-400 line-through' : 'text-mint-dark'}`}>
                          R$ {item.preco_medio.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner de conclusão */}
      {total > 0 && comprados === total && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-500 text-white text-center py-4 font-bold text-lg shadow-xl z-30 animate-bounce">
          🎉 Compras concluídas!
        </div>
      )}
    </div>
  );
};
