import React, { useState, useMemo } from 'react';
import { Category, Item, FilterType } from '../types';
import { Icon } from './Icon';
import { getItemsByCategory } from '../categoryItems';

// Unidades disponíveis para seleção rápida
const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct', 'dz'];

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
  onDeleteAllItems?: () => void;
  onDeleteCategory?: (mode: 'move' | 'delete') => void;
  autoOpenDeleteCategory?: boolean;
}

// ── Controle de quantidade/unidade inline ─────────────────────────────────────
interface QtyControlProps {
  value: string;
  unidade: string;
  disabled?: boolean;
  onChange: (qty: string, unit: string) => void;
}

const QtyControl: React.FC<QtyControlProps> = ({ value, unidade, disabled, onChange }) => {
  // Extrai só o número da string "2 kg" → 2, ou usa 1 como padrão
  const numericValue = parseFloat(value) || 1;
  const unit = unidade || 'un';

  const step = unit === 'kg' || unit === 'g' || unit === 'L' || unit === 'ml' ? 0.5 : 1;

  const decrement = () => {
    const next = Math.max(0.5, numericValue - step);
    onChange(formatQty(next, unit), unit);
  };

  const increment = () => {
    const next = numericValue + step;
    onChange(formatQty(next, unit), unit);
  };

  const handleUnitChange = (newUnit: string) => {
    onChange(formatQty(numericValue, newUnit), newUnit);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(formatQty(parsed, unit), unit);
    } else if (raw === '' || raw === '0') {
      onChange('1', unit);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {/* Decrementar */}
      <button
        onClick={decrement}
        disabled={disabled}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 transition-colors text-base font-bold"
        aria-label="Diminuir quantidade"
      >
        −
      </button>

      {/* Valor numérico */}
      <input
        type="number"
        value={numericValue}
        min={0.5}
        step={step}
        onChange={handleValueChange}
        disabled={disabled}
        className="w-14 text-center text-sm font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1 focus:outline-none focus:ring-1 focus:ring-mint-dark disabled:opacity-40"
        aria-label="Quantidade"
      />

      {/* Incrementar */}
      <button
        onClick={increment}
        disabled={disabled}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 transition-colors text-base font-bold"
        aria-label="Aumentar quantidade"
      >
        +
      </button>

      {/* Seletor de unidade */}
      <select
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value)}
        disabled={disabled}
        className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-mint-dark disabled:opacity-40 cursor-pointer"
        aria-label="Unidade de medida"
      >
        {UNITS.map(u => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  );
};

function formatQty(value: number, unit: string): string {
  // Remove zeros desnecessários: 2.0 → "2", 1.5 → "1.5"
  const str = value % 1 === 0 ? String(value) : value.toFixed(1);
  return `${str} ${unit}`;
}

// ── Componente principal ──────────────────────────────────────────────────────
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
  onDeleteAllItems,
  onDeleteCategory,
  autoOpenDeleteCategory = false,
}) => {
  const [filter, setFilter] = useState<FilterType>(FilterType.TODOS);
  const [confirmAction, setConfirmAction] = useState<'items' | 'category' | null>(null);
  const [categoryDeleteMode, setCategoryDeleteMode] = useState<'move' | 'delete'>('move');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estado local de qty/unidade para itens sugeridos (antes de adicionar à lista)
  const [virtualQty, setVirtualQty] = useState<Record<string, { qty: string; unit: string }>>({});
  const [virtualPrice, setVirtualPrice] = useState<Record<string, string>>({});
  const [virtualChecked, setVirtualChecked] = useState<Record<string, boolean>>({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInputValue, setPriceInputValue] = useState<string>('');

  // Sincronizar ao abrir/fechar
  React.useEffect(() => {
    if (isOpen) {
      setConfirmAction(autoOpenDeleteCategory ? 'category' : null);
      setConfirmDeleteId(null);
    }
  }, [isOpen, autoOpenDeleteCategory]);

  // ── Toggle: real → toggle comprado | virtual → adicionar à lista ──────────
  const handleToggleItem = (item: Item & { isVirtual?: boolean }) => {
    if (item.isVirtual && onAddNewItem) {
      // Marca visualmente primeiro
      setVirtualChecked(prev => ({ ...prev, [item.id]: true }));
      const vq = virtualQty[item.id] || { qty: '1', unit: 'un' };
      const vp = virtualPrice[item.id];
      const newItem: Item = {
        id: new Date().toISOString() + item.nome,
        nome: item.nome,
        quantidade: formatQty(parseFloat(vq.qty) || 1, vq.unit),
        unidade: vq.unit,
        categoria: category,
        comprado: false,
        selecionado: true,
        frequencia: 1,
        ultima_compra: new Date().toISOString(),
        precoUnitario: vp ? parseFloat(vp) || undefined : undefined,
      };
      setTimeout(() => {
        onAddNewItem(newItem);
        setVirtualChecked(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      }, 300);
    } else {
      onToggleItem(item.id);
    }
  };

  // ── Itens sugeridos ───────────────────────────────────────────────────────
  const suggestedItemsRaw = useMemo(() => getItemsByCategory(category), [category]);

  const virtualItems = useMemo(() => {
    const existingNames = new Set(items.map(i => i.nome.trim().toLowerCase()));
    return suggestedItemsRaw
      .filter((name: string) => !existingNames.has(name.trim().toLowerCase()))
      .map((name: string) => ({
        id: `virtual-${name}`,
        nome: name,
        quantidade: '1',
        unidade: 'un',
        categoria: category,
        comprado: false,
        frequencia: 0,
        ultima_compra: new Date().toISOString(),
        isVirtual: true,
      } as Item & { isVirtual: boolean }));
  }, [suggestedItemsRaw, items, category]);

  const allItems = useMemo(() => [...items, ...virtualItems], [items, virtualItems]);

  const filteredItems = useMemo(() => {
    if (filter === FilterType.PENDENTES) {
      return allItems.filter((item: Item & { isVirtual?: boolean }) => item.isVirtual || !item.selecionado);
    }
    if (filter === FilterType.COMPRADOS) {
      return allItems.filter((item: Item) => item.selecionado);
    }
    return allItems;
  }, [allItems, filter]);

  const selectedCount = useMemo(() => items.filter((i: Item) => i.selecionado).length, [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark-gray dark:text-white">{category}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCount} selecionados · {items.length} na lista
            </p>
          </div>
          <button
            onClick={() => onAddItem(category)}
            className="flex items-center gap-1.5 px-3 py-2 bg-mint hover:bg-mint-dark text-dark-gray rounded-lg transition text-sm font-semibold"
          >
            <Icon name="plus" className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <div className="px-4 py-2 flex gap-2 border-b dark:border-gray-700">
          {(Object.values(FilterType) as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
                filter === f
                  ? 'bg-mint text-dark-gray'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Lista de itens ─────────────────────────────────────────────── */}
        <div className="flex-grow overflow-y-auto p-3 space-y-2">
          {filteredItems.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
              Nenhum item encontrado.
            </p>
          ) : (
            filteredItems.map((item: Item & { isVirtual?: boolean }) => {
              const isVirtual = item.isVirtual === true;
              const awaitingDelete = confirmDeleteId === item.id;

              // Quantidade e unidade atuais do item
              const currentUnit = item.unidade || 'un';
              const currentNumeric = parseFloat(item.quantidade) || 1;

              // Para virtuais: estado local de qty/unit
              const vq = virtualQty[item.id] || { qty: String(currentNumeric), unit: currentUnit };

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-all ${
                    isVirtual
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : item.selecionado
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3 p-3">

                    {/* ── Checkbox ── */}
                    <div className="flex-shrink-0 pt-0.5">
                      <input
                        type="checkbox"
                        checked={isVirtual ? (virtualChecked[item.id] ?? false) : (item.selecionado ?? false)}
                        onChange={() => handleToggleItem(item)}
                        className="w-5 h-5 rounded cursor-pointer accent-green-500"
                        title={isVirtual ? 'Adicionar à lista' : item.selecionado ? 'Remover da lista de compras' : 'Adicionar à lista de compras'}
                      />
                    </div>

                    {/* ── Corpo: nome + qty/unit + detalhes ── */}
                    <div className="flex-1 min-w-0">
                      {/* Nome */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${
                          isVirtual
                            ? 'text-blue-700 dark:text-blue-300'
                            : item.selecionado
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-dark-gray dark:text-white'
                        }`}>
                          {item.nome}
                        </span>
                        {isVirtual && (
                          <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                            sugerido
                          </span>
                        )}
                        {!isVirtual && item.selecionado && (
                          <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full">
                            ✓ na lista
                          </span>
                        )}
                      </div>

                      {/* Quantidade */}
                      {isVirtual ? (
                        // Sugeridos: controle inline de qty antes de adicionar
                        <QtyControl
                          value={vq.qty}
                          unidade={vq.unit}
                          onChange={(qty, unit) =>
                            setVirtualQty(prev => ({ ...prev, [item.id]: { qty, unit } }))
                          }
                        />
                      ) : (
                        // Reais: controle inline de qty persistido via onEditItem
                        <QtyControl
                          value={String(currentNumeric)}
                          unidade={currentUnit}
                          disabled={item.comprado}
                          onChange={(qty, unit) => onEditItem({ ...item, quantidade: qty, unidade: unit })}
                        />
                      )}

                      {/* Detalhes opcionais (apenas reais) */}
                      {!isVirtual && (
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          {item.localCompra && (
                            <span className="text-xs text-gray-400">📍 {item.localCompra}</span>
                          )}
                          {item.observacao && (
                            <span className="text-xs text-gray-400 italic">💬 {item.observacao}</span>
                          )}
                        </div>
                      )}

                      {/* Preço inline — disponível em todos os itens */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {editingPriceId === item.id ? (
                          <>
                            <span className="text-xs text-gray-500 dark:text-gray-400">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={priceInputValue}
                              autoFocus
                              onChange={e => setPriceInputValue(e.target.value)}
                              onBlur={() => {
                                const parsed = parseFloat(priceInputValue.replace(',', '.'));
                                if (isVirtual) {
                                  setVirtualPrice(prev => ({ ...prev, [item.id]: isNaN(parsed) ? '' : String(parsed) }));
                                } else {
                                  onEditItem({ ...item, precoUnitario: isNaN(parsed) ? undefined : parsed });
                                }
                                setEditingPriceId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') setEditingPriceId(null);
                              }}
                              className="w-20 text-xs font-semibold bg-white dark:bg-gray-700 border border-mint-dark dark:border-mint rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-mint-dark"
                              aria-label="Preço unitário"
                            />
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPriceId(item.id);
                              const currentPrice = isVirtual
                                ? virtualPrice[item.id] || ''
                                : item.precoUnitario != null ? String(item.precoUnitario) : '';
                              setPriceInputValue(currentPrice);
                            }}
                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-mint-dark dark:hover:text-mint transition-colors"
                            title="Adicionar preço"
                          >
                            {(isVirtual ? virtualPrice[item.id] : item.precoUnitario != null)
                              ? `R$ ${isVirtual ? parseFloat(virtualPrice[item.id]).toFixed(2) : item.precoUnitario!.toFixed(2)} ✏️`
                              : '+ adicionar preço'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Ações ── */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {!isVirtual && (
                        // Real: Editar + Excluir
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title={`Editar ${item.nome}`}
                            aria-label={`Editar ${item.nome}`}
                          >
                            <Icon name="pencil" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 rounded-lg text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            title={`Excluir ${item.nome}`}
                            aria-label={`Excluir ${item.nome}`}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Confirmação de exclusão individual ── */}
                  {awaitingDelete && (
                    <div className="mx-3 mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                        Excluir "{item.nome}"?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { onDeleteItem(item.id); setConfirmDeleteId(null); }}
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
            })
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="p-4 border-t dark:border-gray-700">

          {/* Confirmação de ação em massa */}
          {confirmAction && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              {confirmAction === 'items' ? (
                <>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    Remover todos os {items.length} itens de "{category}"?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDeleteAllItems?.(); setConfirmAction(null); }}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    Excluir a categoria "{category}"?
                  </p>
                  {items.length > 0 && (
                    <div className="mb-2 space-y-1">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        O que fazer com os {items.length} itens?
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                        <input type="radio" name="catDeleteMode" value="move"
                          checked={categoryDeleteMode === 'move'}
                          onChange={() => setCategoryDeleteMode('move')}
                          className="accent-mint-dark"
                        />
                        Mover para "Outros"
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                        <input type="radio" name="catDeleteMode" value="delete"
                          checked={categoryDeleteMode === 'delete'}
                          onChange={() => setCategoryDeleteMode('delete')}
                          className="accent-red-500"
                        />
                        Excluir junto com a categoria
                      </label>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDeleteCategory?.(categoryDeleteMode); setConfirmAction(null); onClose(); }}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {items.length > 0 && onDeleteAllItems && (
                <button
                  onClick={() => setConfirmAction('items')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg border border-red-200 dark:border-red-800 transition-colors font-medium"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                  Excluir itens
                </button>
              )}
              {onDeleteCategory && (
                <button
                  onClick={() => setConfirmAction('category')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg border border-red-300 dark:border-red-700 transition-colors font-medium"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                  Excluir categoria
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
   