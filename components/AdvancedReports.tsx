import React, { useState, useMemo } from 'react';
import { Item, ArchivedList } from '../types';

interface AdvancedReportsProps {
  items: Item[];
  archivedLists: ArchivedList[];
  showButton?: boolean;
}

export const AdvancedReports: React.FC<AdvancedReportsProps> = ({ items, archivedLists, showButton = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [selectedReport, setSelectedReport] = useState<'spending' | 'categories' | 'trends' | 'frequency'>('spending');

  // Filtrar dados por período
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    // Filtrar itens por data de última compra
    const filteredItems = items.filter(item => {
      if (!item.ultima_compra) return false;
      return new Date(item.ultima_compra) >= startDate;
    });

    // Filtrar listas arquivadas
    const filteredArchivedLists = archivedLists.filter(list => {
      return new Date(list.date) >= startDate;
    });

    return { items: filteredItems, archivedLists: filteredArchivedLists };
  }, [items, archivedLists, selectedPeriod]);

  // Relatório de Gastos
  const spendingReport = useMemo(() => {
    const itemsWithPrice = filteredData.items.filter(item => item.preco_medio);
    const totalSpent = itemsWithPrice.reduce((sum, item) => sum + item.preco_medio!, 0);
    const averageSpent = itemsWithPrice.length > 0 ? totalSpent / itemsWithPrice.length : 0;
    
    const monthlySpending = filteredData.archivedLists.reduce((sum, list) => {
      return sum + list.items.reduce((listSum, item) => {
        return listSum + (item.preco_medio || 0);
      }, 0);
    }, 0);

    return {
      totalSpent,
      averageSpent,
      monthlySpending,
      itemsWithPrice: itemsWithPrice.length,
      totalItems: filteredData.items.length
    };
  }, [filteredData]);

  // Relatório por Categorias
  const categoryReport = useMemo(() => {
    const categoryStats = filteredData.items.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = {
          count: 0,
          totalSpent: 0,
          items: []
        };
      }
      
      acc[item.categoria].count++;
      acc[item.categoria].totalSpent += item.preco_medio || 0;
      acc[item.categoria].items.push(item);
      
      return acc;
    }, {} as Record<string, { count: number; totalSpent: number; items: Item[] }>);

    const sortedCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b.totalSpent - a.totalSpent);

    return sortedCategories;
  }, [filteredData.items]);

  // Relatório de Tendências
  const trendsReport = useMemo(() => {
    // Agrupar por semana
    const weeklyData = filteredData.archivedLists.reduce((acc, list) => {
      const weekStart = new Date(list.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!acc[weekKey]) {
        acc[weekKey] = { count: 0, totalSpent: 0, items: [] };
      }
      
      acc[weekKey].count += list.items.length;
      acc[weekKey].totalSpent += list.items.reduce((sum, item) => sum + (item.preco_medio || 0), 0);
      acc[weekKey].items.push(...list.items);
      
      return acc;
    }, {} as Record<string, { count: number; totalSpent: number; items: Item[] }>);

    return Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8); // Últimas 8 semanas
  }, [filteredData.archivedLists]);

  // Relatório de Frequência
  const frequencyReport = useMemo(() => {
    const frequencyStats = filteredData.items.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    const categoryFrequency = Object.entries(frequencyStats).map(([category, items]) => {
      const avgFrequency = items.reduce((sum, item) => sum + item.frequencia, 0) / items.length;
      const avgDaysBetween = items.reduce((sum, item) => sum + (item.dias_entre_compras || 0), 0) / items.length;
      
      return {
        category,
        itemCount: items.length,
        avgFrequency,
        avgDaysBetween,
        mostFrequent: items.sort((a, b) => b.frequencia - a.frequencia)[0]
      };
    }).sort((a, b) => b.avgFrequency - a.avgFrequency);

    return categoryFrequency;
  }, [filteredData.items]);

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <>
      {/* Botão para abrir modal - só renderiza se showButton for true */}
      {showButton && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-xs md:text-sm w-full"
          title="Relatórios Avançados"
        >
          <span>📊</span>
          <span className="font-medium">Relatórios</span>
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 md:p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark-gray dark:text-light-gray">
                📊 Relatórios
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Controles */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-1">
                  Período
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="1y">Último ano</option>
                  <option value="all">Todo o período</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-1">
                  Relatório
                </label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="spending">💰 Gastos</option>
                  <option value="categories">📂 Categorias</option>
                  <option value="trends">📈 Tendências</option>
                  <option value="frequency">🔄 Frequência</option>
                </select>
              </div>
            </div>

            {/* Relatório de Gastos */}
            {selectedReport === 'spending' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-dark-gray dark:text-light-gray">
                  💰 Relatório de Gastos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                    <div className="text-blue-700 dark:text-blue-300 text-sm">Total Gasto</div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {formatCurrency(spendingReport.totalSpent)}
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                    <div className="text-green-700 dark:text-green-300 text-sm">Média por Item</div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {formatCurrency(spendingReport.averageSpent)}
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                    <div className="text-purple-700 dark:text-purple-300 text-sm">Gasto Mensal</div>
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                      {formatCurrency(spendingReport.monthlySpending)}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-dark-gray dark:text-light-gray mb-3">📊 Estatísticas</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total de itens: {spendingReport.totalItems}</div>
                    <div>Itens com preço: {spendingReport.itemsWithPrice}</div>
                    <div>Listas arquivadas: {filteredData.archivedLists.length}</div>
                    <div>Taxa de preenchimento: {spendingReport.totalItems > 0 ? Math.round((spendingReport.itemsWithPrice / spendingReport.totalItems) * 100) : 0}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Relatório por Categorias */}
            {selectedReport === 'categories' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-dark-gray dark:text-light-gray">
                  📂 Gastos por Categoria
                </h3>

                <div className="space-y-3">
                  {categoryReport.map(([category, stats], index) => {
                    const percentage = spendingReport.totalSpent > 0 
                      ? (stats.totalSpent / spendingReport.totalSpent) * 100 
                      : 0;

                    return (
                      <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium text-dark-gray dark:text-light-gray">
                            {category}
                          </div>
                          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(stats.totalSpent)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {stats.count} itens • Média: {formatCurrency(stats.totalSpent / stats.count)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relatório de Tendências */}
            {selectedReport === 'trends' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-dark-gray dark:text-light-gray">
                  📈 Tendências de Compra
                </h3>

                <div className="space-y-4">
                  {trendsReport.map(([week, data]) => (
                    <div key={week} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-dark-gray dark:text-light-gray">
                          Semana de {formatDate(week)}
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(data.totalSpent)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {data.count} itens comprados
                      </div>
                    </div>
                  ))}
                </div>

                {trendsReport.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    📊 Dados insuficientes para análise de tendências
                  </div>
                )}
              </div>
            )}

            {/* Relatório de Frequência */}
            {selectedReport === 'frequency' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-dark-gray dark:text-light-gray">
                  🔄 Frequência de Compra
                </h3>

                <div className="space-y-4">
                  {frequencyReport.map((report, index) => (
                    <div key={report.category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-dark-gray dark:text-light-gray">
                          {report.category}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {report.itemCount} itens
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Frequência média:</span>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {report.avgFrequency.toFixed(1)}x
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Dias entre compras:</span>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {report.avgDaysBetween.toFixed(0)} dias
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Item mais frequente:</span>
                          <div className="font-semibold text-purple-600 dark:text-purple-400">
                            {report.mostFrequent.nome} ({report.mostFrequent.frequencia}x)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {frequencyReport.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    📊 Dados insuficientes para análise de frequência
                  </div>
                )}
              </div>
            )}

            {/* Resumo do Período */}
            <div className="mt-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-dark-gray dark:text-light-gray mb-2">
                📅 Resumo do Período Selecionado
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Período:</span>
                  <div className="font-semibold">
                    {selectedPeriod === '7d' ? '7 dias' :
                     selectedPeriod === '30d' ? '30 dias' :
                     selectedPeriod === '90d' ? '90 dias' :
                     selectedPeriod === '1y' ? '1 ano' : 'Todo período'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Itens:</span>
                  <div className="font-semibold">{filteredData.items.length}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Listas:</span>
                  <div className="font-semibold">{filteredData.archivedLists.length}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total gasto:</span>
                  <div className="font-semibold">{formatCurrency(spendingReport.totalSpent)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
