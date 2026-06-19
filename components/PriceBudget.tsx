import React, { useState, useEffect } from 'react';
import { Item } from '../types';

interface PriceBudgetProps {
  items: Item[];
  onUpdateItems: (items: Item[]) => void;
  showButton?: boolean;
}

export const PriceBudget: React.FC<PriceBudgetProps> = ({ items, onUpdateItems, showButton = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budget, setBudget] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [priceInput, setPriceInput] = useState('');

  // Carregar orçamento do localStorage
  useEffect(() => {
    const savedBudget = localStorage.getItem('shoppingBudget');
    if (savedBudget) {
      setBudget(parseFloat(savedBudget));
    }
  }, []);

  // Salvar orçamento
  const saveBudget = (newBudget: number) => {
    setBudget(newBudget);
    localStorage.setItem('shoppingBudget', newBudget.toString());
  };

  // Adicionar preço a um item
  const addPriceToItem = (item: Item, price: number) => {
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        const historicoPrecos = i.historico_precos || [];
        const precoMedio = i.preco_medio || 0;
        const totalPrecos = historicoPrecos.length;
        
        // Calcular novo preço médio
        const novoPrecoMedio = totalPrecos > 0 
          ? (precoMedio * totalPrecos + price) / (totalPrecos + 1)
          : price;

        return {
          ...i,
          preco_medio: novoPrecoMedio,
          historico_precos: [...historicoPrecos, price],
          ultima_compra: new Date().toISOString()
        };
      }
      return i;
    });

    onUpdateItems(updatedItems);
    setSelectedItem(null);
    setPriceInput('');
  };

  // Calcular totais
  const totalEstimated = items.reduce((sum, item) => {
    if (!item.comprado && item.preco_medio) {
      return sum + item.preco_medio;
    }
    return sum;
  }, 0);

  const totalSpent = items.reduce((sum, item) => {
    if (item.comprado && item.preco_medio) {
      return sum + item.preco_medio;
    }
    return sum;
  }, 0);

  const remainingBudget = budget - totalSpent;
  const budgetPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Sugestões de preços baseadas em histórico
  const getPriceSuggestions = (item: Item) => {
    if (!item.historico_precos || item.historico_precos.length === 0) {
      return [];
    }

    const prices = item.historico_precos.sort((a, b) => b - a);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return [
      { label: 'Média', value: avg },
      { label: 'Menor', value: min },
      { label: 'Maior', value: max }
    ];
  };

  return (
    <>
      {/* Botão para abrir modal - só renderiza se showButton for true */}
      {showButton && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs md:text-sm w-full"
          title="Gestão de Preços e Orçamento"
        >
          <span>💰</span>
          <span className="font-medium">Orçamento</span>
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark-gray dark:text-light-gray">
                💰 Gestão de Preços
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Painel de Orçamento */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-dark-gray dark:text-light-gray">
                  📊 Resumo Financeiro
                </h3>

                {/* Definir Orçamento */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                    Orçamento Total
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => saveBudget(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={() => saveBudget(0)}
                      className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <span className="text-blue-700 dark:text-blue-300">💰 Orçamento:</span>
                    <span className="font-semibold text-blue-800 dark:text-blue-200">
                      {formatCurrency(budget)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                    <span className="text-green-700 dark:text-green-300">✅ Gasto:</span>
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      {formatCurrency(totalSpent)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900 rounded-lg">
                    <span className="text-orange-700 dark:text-orange-300">⏳ Estimado:</span>
                    <span className="font-semibold text-orange-800 dark:text-orange-200">
                      {formatCurrency(totalEstimated)}
                    </span>
                  </div>

                  <div className={`flex justify-between items-center p-3 rounded-lg ${
                    remainingBudget >= 0 
                      ? 'bg-green-50 dark:bg-green-900' 
                      : 'bg-red-50 dark:bg-red-900'
                  }`}>
                    <span className={remainingBudget >= 0 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                    }>
                      📊 Restante:
                    </span>
                    <span className={`font-semibold ${
                      remainingBudget >= 0 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {formatCurrency(Math.abs(remainingBudget))}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                {budget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progresso do Orçamento</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {budgetPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          budgetPercentage > 100 ? 'bg-red-500' :
                          budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Itens com Preços */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-dark-gray dark:text-light-gray">
                  🛒 Itens com Preços
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-dark-gray dark:text-light-gray">
                            {item.nome}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {item.quantidade} • {item.categoria}
                          </div>
                          {item.preco_medio && (
                            <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                              💰 {formatCurrency(item.preco_medio)}
                              {item.historico_precos && item.historico_precos.length > 1 && (
                                <span className="text-gray-500 ml-2">
                                  ({item.historico_precos.length} compras)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="ml-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                        >
                          {item.preco_medio ? 'Editar' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {items.filter(item => item.preco_medio).length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      📝 Nenhum item com preço cadastrado
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para adicionar/editar preço */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-dark-gray dark:text-light-gray">
                💰 {selectedItem.preco_medio ? 'Editar' : 'Adicionar'} Preço
              </h3>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setPriceInput('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="font-medium text-dark-gray dark:text-light-gray">
                  {selectedItem.nome}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedItem.quantidade} • {selectedItem.categoria}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Sugestões de preços */}
              {getPriceSuggestions(selectedItem).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                    💡 Sugestões baseadas no histórico:
                  </label>
                  <div className="flex space-x-2">
                    {getPriceSuggestions(selectedItem).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setPriceInput(suggestion.value.toFixed(2))}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
                      >
                        {suggestion.label}: {formatCurrency(suggestion.value)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const price = parseFloat(priceInput);
                    if (price > 0) {
                      addPriceToItem(selectedItem, price);
                    }
                  }}
                  disabled={!priceInput || parseFloat(priceInput) <= 0}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-lg transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setPriceInput('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
