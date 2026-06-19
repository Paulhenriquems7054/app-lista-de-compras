
import React, { useState, useMemo } from 'react';
import { Category, Item, FilterType } from '../types';
import { Icon } from './Icon';
import { getItemsByCategory } from '../categoryItems';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
  items: Item[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: Item) => void;
  onAddItem: (category: Category) => void;
  onAddNewItem?: (item: Item) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  items,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  onAddItem,
  onAddNewItem,
}) => {
  const [filter, setFilter] = useState<FilterType>(FilterType.TODOS);

  const handleToggleItem = (item: Item & { isVirtual?: boolean }) => {
    if (item.isVirtual && onAddNewItem) {
      // Criar item real quando um virtual for clicado
      const newItem: Item = {
        id: new Date().toISOString() + item.nome,
        nome: item.nome,
        quantidade: '1',
        categoria: category,
        comprado: false,
        frequencia: 1,
        ultima_compra: new Date().toISOString(),
      };
      onAddNewItem(newItem);
    } else {
      onToggleItem(item.id);
    }
  };

  // Criar itens virtuais dos sugeridos que ainda não estão na lista
  const suggestedItemsRaw = useMemo(() => getItemsByCategory(category), [category]);
  
  const virtualItems = useMemo(() => {
    const existingNames = items.map(i => i.nome.toLowerCase());
    return suggestedItemsRaw
      .filter(name => !existingNames.includes(name.toLowerCase()))
      .map(name => ({
        id: `virtual-${name}`,
        nome: name,
        quantidade: '1',
        categoria: category,
        comprado: false,
        frequencia: 0,
        ultima_compra: new Date().toISOString(),
        isVirtual: true, // Flag para identificar itens virtuais
      } as Item & { isVirtual: boolean }));
  }, [suggestedItemsRaw, items, category]);

  // Combinar itens reais com virtuais
  const allItems = useMemo(() => [...items, ...virtualItems], [items, virtualItems]);

  const filteredItems = useMemo(() => {
    if (filter === FilterType.PENDENTES) {
      return allItems.filter(item => !item.comprado);
    }
    if (filter === FilterType.COMPRADOS) {
      return allItems.filter(item => item.comprado);
    }
    return allItems;
  }, [allItems, filter]);
  
  const purchasedCount = useMemo(() => items.filter(item => item.comprado).length, [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">{category}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{purchasedCount} de {items.length} comprados</p>
        </div>
        
        <div className="p-4 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex space-x-2">
                {(Object.values(FilterType) as FilterType[]).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-sm rounded-full ${filter === f ? 'bg-mint text-dark-gray' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        {f}
                    </button>
                ))}
            </div>
             <button onClick={() => onAddItem(category)} className="flex items-center gap-2 px-3 py-2 bg-mint hover:bg-mint-dark text-dark-gray rounded-md transition text-sm">
                <Icon name="plus" className="h-4 w-4" />
                Adicionar
            </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => {
              const itemWithVirtual = item as Item & { isVirtual?: boolean };
              const isVirtual = itemWithVirtual.isVirtual || false;
              
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isVirtual 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : 'bg-light-gray dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={item.comprado}
                      onChange={() => handleToggleItem(itemWithVirtual)}
                      className="h-5 w-5 rounded text-mint-dark focus:ring-mint-dark border-gray-300"
                    />
                    <div className="flex-1">
                      <span className={`transition ${item.comprado ? 'line-through text-gray-500' : ''} ${isVirtual ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                        {item.nome}
                        {isVirtual && <span className="ml-2 text-xs text-blue-500">(sugerido)</span>}
                      </span>
                      <p className={`text-xs text-gray-500 transition ${item.comprado ? 'line-through' : ''}`}>{item.quantidade}</p>
                    </div>
                  </div>
                  {!isVirtual && (
                    <div className="flex space-x-2">
                      <button onClick={() => onEditItem(item)} className="p-2 text-gray-500 hover:text-blue-500"><Icon name="pencil" className="h-5 w-5" /></button>
                      <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-500 hover:text-red-500"><Icon name="trash" className="h-5 w-5" /></button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item encontrado.</p>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
