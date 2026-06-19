
import React, { useState, useEffect } from 'react';
import { Item, Category, CustomCategory } from '../types';
import { CATEGORY_NAMES } from '../constants';
import { searchItems, getItemsByCategory } from '../categoryItems';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  itemToEdit?: Item | null;
  customCategories?: CustomCategory[];
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSave, itemToEdit, customCategories = [] }) => {
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [categoria, setCategoria] = useState<Category>(Category.OUTROS);
  const [preco, setPreco] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setNome(itemToEdit.nome);
      setQuantidade(itemToEdit.quantidade);
      setCategoria(itemToEdit.categoria);
      setPreco(itemToEdit.preco_medio?.toString() || '');
    } else {
      setNome('');
      setQuantidade('');
      setCategoria(Category.OUTROS);
      setPreco('');
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }, [itemToEdit, isOpen]);

  // Atualizar sugestões quando o nome ou categoria mudar
  useEffect(() => {
    if (nome.trim().length >= 2) {
      const results = searchItems(nome, categoria);
      setSuggestions(results.slice(0, 8)); // Limitar a 8 sugestões
      setShowSuggestions(true);
    } else if (nome.trim().length === 0 && !itemToEdit) {
      // Mostrar itens comuns da categoria quando o campo estiver vazio
      const categoryItems = getItemsByCategory(categoria);
      setSuggestions(categoryItems.slice(0, 8));
      setShowSuggestions(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [nome, categoria, itemToEdit]);

  const handleSelectSuggestion = (suggestion: string) => {
    setNome(suggestion);
    setShowSuggestions(false);
  };

  const handleSave = () => {
    if (!nome.trim()) return;
    
    const precoNumerico = preco ? parseFloat(preco.replace(',', '.')) : undefined;
    const historicoPrecos = itemToEdit?.historico_precos || [];
    
    // Adicionar novo preço ao histórico se foi informado
    if (precoNumerico && precoNumerico > 0) {
      historicoPrecos.push(precoNumerico);
    }
    
    // Calcular preço médio
    const precoMedio = historicoPrecos.length > 0 
      ? historicoPrecos.reduce((a, b) => a + b, 0) / historicoPrecos.length 
      : precoNumerico;
    
    // Calcular dias entre compras
    let diasEntreCompras = itemToEdit?.dias_entre_compras;
    if (itemToEdit?.ultima_compra && itemToEdit.frequencia > 1) {
      const ultimaCompraDate = new Date(itemToEdit.ultima_compra);
      const agora = new Date();
      const diasDecorridos = Math.floor((agora.getTime() - ultimaCompraDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Média móvel simples dos dias entre compras
      diasEntreCompras = diasEntreCompras 
        ? (diasEntreCompras + diasDecorridos) / 2 
        : diasDecorridos;
    }
    
    const newItem: Item = {
      id: itemToEdit?.id || new Date().toISOString(),
      nome,
      quantidade,
      categoria,
      comprado: itemToEdit?.comprado || false,
      frequencia: itemToEdit?.frequencia || 1,
      ultima_compra: itemToEdit?.ultima_compra || new Date().toISOString(),
      preco_medio: precoMedio,
      historico_precos: historicoPrecos,
      dias_entre_compras: diasEntreCompras,
    };
    onSave(newItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{itemToEdit ? 'Editar Item' : 'Adicionar Item'}</h2>
        
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Item</label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-mint-dark focus:border-mint-dark"
              placeholder="Ex: Leite"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade</label>
            <input
              type="text"
              id="quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-mint-dark focus:border-mint-dark"
              placeholder="Ex: 1 litro"
            />
          </div>

          <div>
            <label htmlFor="preco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preço (opcional)
              {itemToEdit?.preco_medio && (
                <span className="ml-2 text-xs text-gray-500">
                  Média: R$ {itemToEdit.preco_medio.toFixed(2)}
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <input
                type="text"
                id="preco"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="mt-1 block w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-mint-dark focus:border-mint-dark"
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Category)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-mint-dark focus:border-mint-dark"
            >
              {CATEGORY_NAMES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {customCategories.length > 0 && (
                <optgroup label="Personalizadas">
                  {customCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-mint hover:bg-mint-dark text-dark-gray rounded-md transition"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
