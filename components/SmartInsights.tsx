import React, { useMemo } from 'react';
import { Item, Category } from '../types';
import { Icon } from './Icon';

interface SmartInsightsProps {
  items: Item[];
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ items }) => {
  const insights = useMemo(() => {
    // Itens que podem estar acabando (baseado na frequência de compra)
    const itemsParaReposicao = items
      .filter(item => {
        if (!item.dias_entre_compras || !item.ultima_compra) return false;
        const ultimaCompra = new Date(item.ultima_compra);
        const hoje = new Date();
        const diasDecorridos = Math.floor((hoje.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
        return diasDecorridos >= item.dias_entre_compras * 0.8; // 80% do tempo entre compras
      })
      .sort((a, b) => {
        const diasA = Math.floor((new Date().getTime() - new Date(a.ultima_compra).getTime()) / (1000 * 60 * 60 * 24));
        const diasB = Math.floor((new Date().getTime() - new Date(b.ultima_compra).getTime()) / (1000 * 60 * 60 * 24));
        return diasB - diasA;
      })
      .slice(0, 5);

    // Itens mais frequentes
    const itensMaisFrequentes = items
      .filter(item => item.frequencia > 0)
      .sort((a, b) => b.frequencia - a.frequencia)
      .slice(0, 5);

    // Gasto total estimado
    const gastoEstimado = items
      .filter(item => !item.comprado && item.preco_medio)
      .reduce((total, item) => total + (item.preco_medio || 0), 0);

    // Gasto por categoria
    const gastoPorCategoria = items
      .filter(item => item.preco_medio && !item.comprado)
      .reduce((acc, item) => {
        const categoria = item.categoria;
        if (!acc[categoria]) {
          acc[categoria] = { total: 0, itens: 0 };
        }
        acc[categoria].total += item.preco_medio || 0;
        acc[categoria].itens += 1;
        return acc;
      }, {} as Record<Category, { total: number; itens: number }>);

    const categoriasMaisCostosas = Object.entries(gastoPorCategoria)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 3);

    // Estatísticas gerais
    const totalItensComPreco = items.filter(item => item.preco_medio).length;
    const precoMedioGeral = totalItensComPreco > 0
      ? items.filter(item => item.preco_medio).reduce((sum, item) => sum + (item.preco_medio || 0), 0) / totalItensComPreco
      : 0;

    return {
      itemsParaReposicao,
      itensMaisFrequentes,
      gastoEstimado,
      categoriasMaisCostosas,
      precoMedioGeral,
      totalItensComPreco,
    };
  }, [items]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="lightbulb" className="h-6 w-6 text-mint-dark" />
        <h2 className="text-2xl font-bold">Insights Inteligentes</h2>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="shopping-cart" className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Gasto Estimado da Lista</h3>
          </div>
          <p className="text-3xl font-bold text-mint-dark">
            {insights.gastoEstimado > 0 ? `R$ ${insights.gastoEstimado.toFixed(2)}` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Baseado nos preços médios</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="chart-bar" className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Preço Médio por Item</h3>
          </div>
          <p className="text-3xl font-bold text-mint-dark">
            {insights.precoMedioGeral > 0 ? `R$ ${insights.precoMedioGeral.toFixed(2)}` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{insights.totalItensComPreco} itens com preço</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="clock" className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Itens para Reposição</h3>
          </div>
          <p className="text-3xl font-bold text-mint-dark">{insights.itemsParaReposicao.length}</p>
          <p className="text-xs text-gray-500 mt-1">Baseado no histórico de compras</p>
        </div>
      </div>

      {/* Itens para reposição */}
      {insights.itemsParaReposicao.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Icon name="bell" className="h-5 w-5 text-orange-500" />
            Sugestões de Reposição
          </h3>
          <div className="space-y-2">
            {insights.itemsParaReposicao.map(item => {
              const diasDecorridos = Math.floor((new Date().getTime() - new Date(item.ultima_compra).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={item.id} className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="font-semibold">{item.nome}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Última compra há {diasDecorridos} dias
                      {item.dias_entre_compras && ` (média: ${Math.round(item.dias_entre_compras)} dias)`}
                    </p>
                  </div>
                  {item.preco_medio && (
                    <span className="text-sm font-semibold text-mint-dark">
                      R$ {item.preco_medio.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorias mais costosas */}
      {insights.categoriasMaisCostosas.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Icon name="currency-dollar" className="h-5 w-5 text-green-500" />
            Gastos por Categoria (Lista Atual)
          </h3>
          <div className="space-y-3">
            {insights.categoriasMaisCostosas.map(([categoria, dados]) => (
              <div key={categoria} className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-semibold">{categoria}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{dados.itens} {dados.itens === 1 ? 'item' : 'itens'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-mint-dark h-2 rounded-full" 
                      style={{ width: `${(dados.total / insights.gastoEstimado) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-mint-dark min-w-[80px] text-right">
                    R$ {dados.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Itens mais frequentes */}
      {insights.itensMaisFrequentes.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Icon name="star" className="h-5 w-5 text-yellow-500" />
            Seus Itens Favoritos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.itensMaisFrequentes.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Comprado {item.frequencia}x
                  </p>
                </div>
                <span className="text-2xl">⭐</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem caso não haja dados suficientes */}
      {insights.itemsParaReposicao.length === 0 && 
       insights.itensMaisFrequentes.length === 0 && 
       insights.gastoEstimado === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
          <Icon name="information-circle" className="h-12 w-12 text-blue-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2">Continue usando o app!</h3>
          <p className="text-gray-600 dark:text-gray-400">
            À medida que você adiciona itens, registra preços e marca compras, 
            o app aprenderá seus hábitos e fornecerá insights personalizados.
          </p>
        </div>
      )}
    </div>
  );
};

