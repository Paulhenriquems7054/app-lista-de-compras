
import React from 'react';
import { Item, ArchivedList } from '../types';
import { CATEGORIES } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';


interface StatsProps {
  items: Item[];
  archivedLists: ArchivedList[];
  onRepeatList: (items: Item[]) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D4FF', '#FFD419', '#8884d8'];

export const Stats: React.FC<StatsProps> = ({ items, archivedLists, onRepeatList }) => {
  const categoryData = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    const allItems = [...items, ...archivedLists.flatMap(l => l.items)];
    allItems.forEach(item => {
      counts[item.categoria] = (counts[item.categoria] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items, archivedLists]);

  const itemFrequencyData = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    const allItems = [...items, ...archivedLists.flatMap(l => l.items)];
    allItems.forEach(item => {
      counts[item.nome] = (counts[item.nome] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items, archivedLists]);

  return (
    <div className="p-4 md:p-6 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">Histórico e Análises</h2>

      {/* Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-center">Categorias Mais Compradas</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
        </div>

        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-center">Itens Mais Frequentes</h3>
           {itemFrequencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={itemFrequencyData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
        </div>
      </div>
      
      {/* History */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Listas Antigas</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {archivedLists.length > 0 ? (
            archivedLists.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(list => (
              <div key={list.date} className="flex justify-between items-center p-4 bg-light-gray dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-semibold">{new Date(list.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{list.items.length} itens</p>
                </div>
                <button onClick={() => onRepeatList(list.items)} className="px-4 py-2 bg-mint hover:bg-mint-dark text-dark-gray rounded-md transition text-sm">
                  Repetir Lista
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">Nenhuma lista arquivada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};
