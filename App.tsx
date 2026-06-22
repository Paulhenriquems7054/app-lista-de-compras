import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Item, Category, ArchivedList, AppView, CustomCategory, PurchaseRecord, PurchaseHistory } from './types';
import { useUserStorage, migrateLeacyDataToUser } from './hooks/useUserStorage';
import { useShoppingSync } from './hooks/useShoppingSync';
import { useAuth, useSession } from './contexts/AuthContext';
import { CATEGORIES } from './constants.tsx';
import { CATEGORY_ITEMS } from './categoryItems';
import { AddItemModal } from './components/AddItemModal';
import { CategoryModal } from './components/CategoryModal';
import { Icon } from './components/Icon';
import { SmartInsights } from './components/SmartInsights';
import { BackupExport } from './components/BackupExport';
import { Notifications } from './components/Notifications';
import { ListSharing } from './components/ListSharing';
import { AdvancedReports } from './components/AdvancedReports';
import { DarkModeToggle } from './components/DarkModeToggle';
import { ShoppingMode } from './components/ShoppingMode';
import { HistoryView } from './components/HistoryView';
import { ConsumptionDashboard } from './components/ConsumptionDashboard';
import { useConsumptionStats } from './hooks/useConsumptionStats';
import { AuthScreen } from './components/auth/AuthScreen';
import { VoiceCommandButton } from './components/VoiceCommandButton';
import { CoupleLink } from './components/CoupleLink';
import { generateId } from './utils/generateId';

const App: React.FC = () => {
    const { user, isLoading, isAuthenticated } = useSession();
    const { signOut } = useAuth();
    const userId = user?.id ?? '';

    // Migração de dados legados — executada uma única vez por usuário
    const migrationDone = useRef(false);
    useEffect(() => {
        if (isAuthenticated && userId && !migrationDone.current) {
            migrationDone.current = true;
            const result = migrateLeacyDataToUser(userId);
            if (result.migrated.length > 0) {
                console.log(`[Auth] Dados migrados para userId ${userId}:`, result.migrated);
            }
        }
    }, [isAuthenticated, userId]);

    // ── Tela de loading ────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-gray dark:bg-dark-bg">
                <div className="text-center">
                    <div className="text-5xl mb-4">🛒</div>
                    <div className="w-8 h-8 border-4 border-mint-dark border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    // ── Tela de auth (não autenticado) ─────────────────────────────────────
    if (!isAuthenticated) {
        return <AuthScreen />;
    }

    // ── App principal ──────────────────────────────────────────────────────
    return <AppMain userId={userId} nomeCasal={user?.nomeCasal ?? ''} onSignOut={signOut} />;
};

// ─── Componente principal isolado por userId ──────────────────────────────────

interface AppMainProps {
    userId: string;
    nomeCasal: string;
    onSignOut: () => Promise<void>;
}

const AppMain: React.FC<AppMainProps> = ({ userId, nomeCasal, onSignOut }) => {
    // ── Lista de compras: Supabase + Realtime (com fallback localStorage) ──
    const {
        items,
        isLoading: isShoppingLoading,
        isSynced,
        addItem: syncAddItem,
        updateItem: syncUpdateItem,
        deleteItem: syncDeleteItem,
        toggleComprado: syncToggleComprado,
        toggleSelecionado: syncToggleSelecionado,
        setItems,
    } = useShoppingSync(userId);

    // ── Outros dados: permanecem em localStorage (histórico, categorias) ──
    const [archivedLists, setArchivedLists] = useUserStorage<ArchivedList[]>(userId, 'archivedLists', []);
    const [purchaseHistory, setPurchaseHistory] = useUserStorage<PurchaseHistory[]>(userId, 'purchaseHistory', []);
    const [customCategories, setCustomCategories] = useUserStorage<CustomCategory[]>(userId, 'customCategories', []);
    const [view, setView] = useState<AppView>(AppView.LISTA);
    const [searchQuery, setSearchQuery] = useState('');

    const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [categoryForNewItem, setCategoryForNewItem] = useState<Category | null>(null);

    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categoryModalAutoDelete, setCategoryModalAutoDelete] = useState(false);
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [isCoupleLinkOpen, setIsCoupleLinkOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️');
    const [showMenuHint, setShowMenuHint] = useState(() => {
        const hintCount = parseInt(localStorage.getItem(`${userId}:menuHintShown`) || '0');
        return hintCount < 3;
    });
    
    const addItem = (item: Item) => {
        syncAddItem(item);
    };
    
    const deleteItem = (id: string) => {
        syncDeleteItem(id);
    };

    const toggleItem = (id: string) => {
        syncToggleComprado(id);
    };

    // Alterna se o item está selecionado para a lista de compras (CategoryModal)
    // Não altera "comprado" — esse status só muda no Modo Compras
    const toggleSelecionado = (id: string) => {
        syncToggleSelecionado(id);
    };

    const handleOpenCategory = (category: Category) => {
        setSelectedCategory(category);
        setCategoryModalAutoDelete(false);
        setCategoryModalOpen(true);
    };

    const handleDeleteCategory = (category: Category) => {
        setSelectedCategory(category);
        setCategoryModalAutoDelete(true);
        setCategoryModalOpen(true);
    };

    const handleEditItem = (item: Item) => {
        setItemToEdit(item);
        setCategoryModalOpen(false); // Close category modal
        setAddItemModalOpen(true);
    };
    
    const handleAddItemFromCategory = (category: Category) => {
        setCategoryForNewItem(category);
        setItemToEdit(null);
        setCategoryModalOpen(false);
        setAddItemModalOpen(true);
    };

    const handleSaveItem = (item: Item) => {
        addItem(item);
        if (categoryForNewItem) {
            handleOpenCategory(categoryForNewItem);
            setCategoryForNewItem(null);
        }
    };
    
    const handleArchiveList = () => {
        const purchasedItems = items.filter(i => i.comprado);
        if (purchasedItems.length === 0) return;

        const now = new Date().toISOString();
        const nowMs = Date.now();

        // 1. Gerar snapshot completo dos itens comprados (Correções 3/6)
        const newRecords: PurchaseRecord[] = purchasedItems.map((item, idx) => {
            const preco = item.precoUnitario ?? item.preco_medio;
            return {
                id: `${nowMs}-${idx}-${Math.random().toString(36).slice(2)}`,
                itemNome: item.nome.trim().toLowerCase(),
                categoria: item.categoria,
                quantidade: item.quantidade,
                precoUnitario: preco,
                precoTotal: preco,
                dataCompra: now,
                localCompra: item.localCompra,
                observacao: item.observacao,
            };
        });

        // 2. Agrupar em sessão PurchaseHistory (Correção 1)
        const valorTotal = newRecords.reduce((s, r) => s + (r.precoUnitario ?? 0), 0);
        const newSession: PurchaseHistory = {
            id: `${nowMs}-${Math.random().toString(36).slice(2)}`,
            data: now,
            itens: newRecords,
            totalItens: newRecords.length,
            valorTotal,
        };
        setPurchaseHistory(prev => [...prev, newSession]);

        // 3. Calcular dias_entre_compras para cada item recém-comprado
        const diasMap = new Map<string, number>();
        for (const item of purchasedItems) {
            if (item.ultima_compra) {
                const diasDecorridos = Math.floor(
                    (new Date(now).getTime() - new Date(item.ultima_compra).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (diasDecorridos > 0) {
                    const novoIntervalo = item.dias_entre_compras
                        ? Math.round((item.dias_entre_compras + diasDecorridos) / 2)
                        : diasDecorridos;
                    diasMap.set(item.id, novoIntervalo);
                }
            }
        }

        // 4. Remover comprados e atualizar intervalos — optimistic update + sync Supabase
        const compradosIds = new Set(purchasedItems.map(p => p.id));

        // Atualizar dias_entre_compras dos não-comprados via Supabase
        for (const [id, dias] of diasMap.entries()) {
            const item = items.find(i => i.id === id);
            if (item) {
                syncUpdateItem({ ...item, dias_entre_compras: dias });
            }
        }

        // Excluir comprados do Supabase (um a um para RLS funcionar corretamente)
        for (const id of compradosIds) {
            syncDeleteItem(id);
        }
    };
    
    const handleRepeatList = (listItems: Item[]) => {
        const itemsToRepeat = listItems.map(item => ({...item, id: generateId(), comprado: false }));
        itemsToRepeat.forEach(item => syncAddItem(item));
        setView(AppView.LISTA);
        alert('Lista repetida e adicionada à sua lista atual!');
    };

    const { totalItems, purchasedItems, totalEstimado } = useMemo(() => {
        const total = items.length;
        const purchased = items.filter(item => item.comprado).length;
        const estimado = items
            .filter(item => !item.comprado && item.preco_medio)
            .reduce((s, i) => s + (i.preco_medio || 0), 0);
        return { totalItems: total, purchasedItems: purchased, totalEstimado: estimado };
    }, [items]);

    const consumptionStats = useConsumptionStats(
        // Extrair todos os PurchaseRecord das sessões PurchaseHistory para o hook de stats
        purchaseHistory.flatMap(session => session.itens),
    );

    // Combinar categorias fixas + personalizadas
    const allCategories = useMemo(() => {
        const custom = customCategories.map(c => ({
            name: c.name as Category,
            icon: <span role="img" aria-label={c.name}>{c.icon}</span>,
            color: c.color,
            isCustom: true,
            customId: c.id,
        }));
        return [...CATEGORIES.map(c => ({ ...c, isCustom: false, customId: '' })), ...custom];
    }, [customCategories]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery) return allCategories;
        const q = searchQuery.toLowerCase();
        // Categorias cujo nome bate com a busca
        const catNames = new Set(allCategories.filter(c => c.name.toLowerCase().includes(q)).map(c => c.name));
        // Categorias que têm itens cujo nome bate com a busca
        items.filter(i => i.nome.toLowerCase().includes(q)).forEach(i => catNames.add(i.categoria));
        return allCategories.filter(c => catNames.has(c.name));
    }, [searchQuery, items, allCategories]);

    // Itens que batem diretamente com a busca (para exibição em lista quando há query)
    // Inclui itens criados pelo usuário + itens sugeridos do catálogo
    const searchedItems = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase().trim();

        // 1. Itens reais criados pelo usuário
        const realItems = items.filter(i => i.nome.toLowerCase().includes(q));
        const realNames = new Set(realItems.map(i => i.nome.toLowerCase()));

        // 2. Itens sugeridos do catálogo que ainda não foram criados
        const suggestedResults: Array<{ id: string; nome: string; categoria: Category; isVirtual: true }> = [];
        for (const cat of CATEGORY_ITEMS) {
            for (const nome of cat.itens) {
                if (nome.toLowerCase().includes(q) && !realNames.has(nome.toLowerCase())) {
                    suggestedResults.push({
                        id: `virtual-${nome}`,
                        nome,
                        categoria: cat.categoria,
                        isVirtual: true,
                    });
                }
            }
        }

        return [...realItems, ...suggestedResults];
    }, [searchQuery, items]);
    
    const itemsByCategory = useMemo(() => {
        return items.reduce((acc, item) => {
            if (!acc[item.categoria]) {
                acc[item.categoria] = [];
            }
            acc[item.categoria].push(item);
            return acc;
        }, {} as Record<Category, Item[]>);
    }, [items]);


    const renderView = () => {
        switch(view) {
            case AppView.DASHBOARD:
                return (
                    <ConsumptionDashboard
                        stats={consumptionStats}
                        onBack={() => setView(AppView.LISTA)}
                    />
                );
            case AppView.COMPRAS:
                return (
                    <ShoppingMode
                        items={items.filter(i => i.selecionado || i.comprado)}
                        onToggleItem={toggleItem}
                        onDeleteItem={deleteItem}
                        onEditItem={handleEditItem}
                        onFinalize={handleArchiveList}
                        onExit={() => setView(AppView.LISTA)}
                    />
                );
            case AppView.HISTORICO:
                return (
                    <HistoryView
                        history={purchaseHistory}
                        onBack={() => setView(AppView.LISTA)}
                        onDeleteHistory={(id) => setPurchaseHistory(prev => prev.filter(h => h.id !== id))}
                    />
                );
            case AppView.INSIGHTS:
                return (
                    <div>
                        <button 
                            onClick={() => setView(AppView.LISTA)}
                            className="flex items-center gap-2 mb-4 px-4 py-2 bg-mint hover:bg-mint-dark text-white rounded-lg transition-colors"
                        >
                            <span>←</span>
                            <span>Voltar para Minhas Listas</span>
                        </button>
                        <SmartInsights items={items} />
                    </div>
                );
            case AppView.COMPARTILHAR:
                return (
                    <div>
                        <button 
                            onClick={() => setView(AppView.LISTA)}
                            className="flex items-center gap-2 mb-4 px-4 py-2 bg-mint hover:bg-mint-dark text-white rounded-lg transition-colors"
                        >
                            <span>←</span>
                            <span>Voltar para Minhas Listas</span>
                        </button>
                        <ListSharing
                            items={items}
                            onLoadSharedList={(loadedItems) => {
                                loadedItems.forEach(item => syncAddItem({
                                    ...item,
                                    id: generateId(),
                                    comprado: false,
                                }));
                            }}
                        />
                    </div>
                );
            case AppView.LISTA:
            default:
                return (
                    <div className="p-4 md:p-6">
                        {/* Botão Iniciar Compras */}
                        {items.length > 0 && !searchQuery && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setView(AppView.COMPRAS)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-mint to-mint-dark text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all text-base"
                                >
                                    <span className="text-xl">🛒</span>
                                    Iniciar Compras ({items.filter(i => i.selecionado && !i.comprado).length} pendentes)
                                </button>
                            </div>
                        )}

                        {/* ── Resultados de itens quando há busca ── */}
                        {searchQuery && (
                            <div className="mb-5">
                                {searchedItems.length > 0 ? (
                                    <>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                            {searchedItems.length} {searchedItems.length === 1 ? 'item encontrado' : 'itens encontrados'}
                                        </p>
                                        <div className="space-y-2">
                                            {searchedItems.map(item => {
                                                const q = searchQuery.toLowerCase();
                                                const idx = item.nome.toLowerCase().indexOf(q);
                                                const before = item.nome.slice(0, idx);
                                                const match  = item.nome.slice(idx, idx + searchQuery.length);
                                                const after  = item.nome.slice(idx + searchQuery.length);
                                                const isVirtual = (item as any).isVirtual === true;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleOpenCategory(item.categoria)}
                                                        className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-mint-dark dark:hover:border-mint transition-colors"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm text-dark-gray dark:text-white">
                                                                {before}
                                                                <mark className="bg-mint/30 dark:bg-mint/20 text-mint-dark dark:text-mint rounded px-0.5">{match}</mark>
                                                                {after}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {item.categoria}
                                                                {isVirtual
                                                                    ? <span className="ml-1.5 text-blue-400">· sugerido</span>
                                                                    : <span className="ml-1.5">· {(item as any).quantidade}{(item as any).unidade ? ' ' + (item as any).unidade : ''}</span>
                                                                }
                                                            </p>
                                                        </div>
                                                        {!isVirtual && (item as any).precoUnitario != null && (
                                                            <span className="text-xs font-semibold text-mint-dark dark:text-mint shrink-0">
                                                                R$ {(item as any).precoUnitario.toFixed(2)}
                                                            </span>
                                                        )}
                                                        {isVirtual ? (
                                                            <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full shrink-0">ver categoria</span>
                                                        ) : (
                                                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${(item as any).selecionado ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                                                {(item as any).selecionado && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 mb-1">Categorias com esses itens:</p>
                                    </>
                                ) : (
                                    <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                                        <p className="text-3xl mb-2">🔍</p>
                                        <p className="text-sm font-medium">Nenhum item encontrado para "<span className="text-dark-gray dark:text-white">{searchQuery}</span>"</p>
                                        <p className="text-xs mt-1">Verifique o nome ou crie o item em uma categoria</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredCategories.map(({ name, icon, color, isCustom, customId }) => {
                                const categoryItems = itemsByCategory[name] || [];
                                const purchasedCount = categoryItems.filter(i => i.comprado).length;
                                const categorySeals = consumptionStats.productStats
                                    .filter(p => p.categoria === name && p.selos.length > 0)
                                    .flatMap(p => p.selos);
                                const uniqueSeals = [...new Set(categorySeals)].slice(0, 3);
                                return (
                                    <div key={name} className="relative group flex flex-col">
                                        {/* Card principal */}
                                        <div
                                            onClick={() => handleOpenCategory(name)}
                                            className="relative p-4 rounded-lg shadow-md cursor-pointer transform hover:scale-105 transition-transform duration-200 bg-white dark:bg-dark-card flex-1"
                                        >
                                            <div className="absolute top-2 right-2 text-2xl">{icon}</div>
                                            {uniqueSeals.length > 0 && (
                                                <div className="absolute top-2 left-2 flex gap-0.5 text-sm">
                                                    {uniqueSeals.map(s => <span key={s}>{s}</span>)}
                                                </div>
                                            )}
                                            <h3 className="font-bold text-lg mt-8">{name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{purchasedCount} / {categoryItems.length} itens</p>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 dark:bg-gray-700">
                                                <div className={`${color} h-1.5 rounded-full`} style={{ width: `${categoryItems.length > 0 ? (purchasedCount / categoryItems.length) * 100 : 0}%` }}></div>
                                            </div>
                                        </div>

                                        {/* Botão excluir — sempre visível, abaixo do card */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCategory(name);
                                            }}
                                            className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors border text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-200 dark:border-red-800"
                                            title={`Excluir categoria "${name}"`}
                                        >
                                            🗑 Excluir categoria
                                        </button>
                                    </div>
                                );
                            })}
                            
                            {/* Botão Criar Nova Categoria */}
                            <div 
                                onClick={() => setIsCreateCategoryModalOpen(true)} 
                                className="relative p-4 rounded-lg shadow-md cursor-pointer transform hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-mint to-mint-dark text-white flex flex-col items-center justify-center min-h-[120px]"
                            >
                                <div className="text-4xl mb-2">➕</div>
                                <h3 className="font-bold text-lg text-center">Nova Categoria</h3>
                                <p className="text-xs opacity-90 mt-1">Criar personalizada</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    // Mostrar splash screen na primeira vez
    // SplashScreen removido - usando apresentacao.html

    // Remover loading indicator quando o React carregar
    useEffect(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
        console.log('✅ App React carregado!');
        
        // Esconder dica após 10 segundos
        if (showMenuHint) {
            const timer = setTimeout(() => {
                setShowMenuHint(false);
                const hintCount = parseInt(localStorage.getItem(`${userId}:menuHintShown`) || '0');
                localStorage.setItem(`${userId}:menuHintShown`, (hintCount + 1).toString());
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [showMenuHint]);

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <header className="header">
                <div className="header-content">
                    {/* Linha 1: Menu Hamburguer + Título */}
                    <div className="flex items-center gap-3 relative">
                        {/* Botão Menu Hamburguer - MUITO VISÍVEL EM TODAS AS TELAS */}
                        <button 
                            onClick={() => {
                                setIsMobileMenuOpen(!isMobileMenuOpen);
                                setShowMenuHint(false);
                            }}
                            className="menu-button"
                            title="Abrir Menu"
                            aria-label="Menu Principal"
                            style={{
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 20px rgba(78, 205, 196, 0.5), 0 0 0 3px rgba(78, 205, 196, 0.1)'
                            }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                            <span>MENU</span>
                            {/* Indicador pulsante */}
                            {showMenuHint && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                        
                        {/* Dica flutuante - aparece nas primeiras 3 vezes */}
                        {showMenuHint && (
                            <div className="absolute left-0 top-full mt-2 z-50 animate-bounce">
                                <div className="bg-mint text-white px-4 py-2 rounded-lg shadow-xl text-sm font-bold whitespace-nowrap">
                                    👈 Clique aqui para acessar o Menu!
                                    <button 
                                        onClick={() => setShowMenuHint(false)}
                                        className="ml-2 text-white hover:text-gray-200"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Título do App + Nome do Casal */}
                        <div className="header-title">
                            <div className="flex items-center gap-2">
                                <h1>Lista de Compras</h1>
                                {/* Indicador de sincronização Realtime */}
                                {isSynced ? (
                                    <span
                                        title="Sincronizado com Supabase — alterações aparecem para todos em tempo real"
                                        className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                                        sync
                                    </span>
                                ) : (
                                    <span
                                        title="Modo offline — dados salvos localmente"
                                        className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                        offline
                                    </span>
                                )}
                            </div>
                            {nomeCasal && (
                                <p className="text-xs text-mint-dark dark:text-mint opacity-90 font-medium truncate max-w-[160px]">
                                    👫 {nomeCasal}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Linha 2: Campo de Busca + Microfone */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="relative flex-grow">
                             <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                             <input 
                                type="text"
                                placeholder="Buscar itens ou categorias..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-full bg-light-gray dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-mint-dark"
                            />
                        </div>
                        {/* Microfone inline no header */}
                        <VoiceCommandButton
                            context={{
                                items,
                                customCategories,
                                addItem,
                                updateItem: (id, changes) => {
                                    const item = items.find(i => i.id === id);
                                    if (item) syncUpdateItem({ ...item, ...changes });
                                },
                                deleteItem,
                                toggleItem,
                                addCustomCategory: (cat) => setCustomCategories(prev => [...prev, cat]),
                                removeCustomCategory: (id) => {
                                    setCustomCategories(prev => prev.filter(c => c.id !== id));
                                },
                            }}
                            inline
                        />
                    </div>
                </div>
                
                {/* Menu Lateral (Drawer) */}
                {isMobileMenuOpen && (
                    <>
                        {/* Overlay */}
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-50 z-40"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        
                        {/* Menu Drawer */}
                        <div className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-dark-card shadow-2xl z-50 overflow-y-auto" style={{paddingTop: 'env(safe-area-inset-top)'}}>
                            <div className="p-4">
                                {/* Header do Menu */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-xl font-bold text-mint-dark">Menu</h2>
                                        <button 
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    {/* Casal logado */}
                                    <div className="flex items-center justify-between bg-mint/10 dark:bg-mint/5 rounded-xl px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-lg">👫</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-dark-gray dark:text-white truncate">{nomeCasal}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Conta ativa</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => { setIsMobileMenuOpen(false); await onSignOut(); }}
                                            className="flex-shrink-0 ml-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                            title="Sair da conta"
                                        >
                                            Sair
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Navegação */}
                                <div className="space-y-2 mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Navegação</h3>
                                    <button 
                                        onClick={() => {setView(AppView.LISTA); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === AppView.LISTA ? 'bg-mint text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="text-2xl">📋</span>
                                        <span className="font-medium">Minhas Listas</span>
                                    </button>
                                    <button 
                                        onClick={() => {setView(AppView.INSIGHTS); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === AppView.INSIGHTS ? 'bg-mint text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="text-2xl">💡</span>
                                        <span className="font-medium">Insights</span>
                                    </button>
                                    <button 
                                        onClick={() => {setView(AppView.HISTORICO); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === AppView.HISTORICO ? 'bg-mint text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="text-2xl">📚</span>
                                        <span className="font-medium">Histórico</span>
                                    </button>
                                    <button 
                                        onClick={() => {setView(AppView.DASHBOARD); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === AppView.DASHBOARD ? 'bg-mint text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="text-2xl">📊</span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="font-medium">Dashboard</span>
                                            {consumptionStats.sugestoes.length > 0 && (
                                                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                                    {consumptionStats.sugestoes.length}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => {setView(AppView.COMPARTILHAR); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === AppView.COMPARTILHAR ? 'bg-mint text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="text-2xl">📤</span>
                                        <span className="font-medium">Compartilhar</span>
                                    </button>
                                    {items.length > 0 && (
                                        <button 
                                            onClick={() => {setView(AppView.COMPRAS); setIsMobileMenuOpen(false);}}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === AppView.COMPRAS ? 'bg-mint text-white' : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400'}`}
                                        >
                                            <span className="text-2xl">🛒</span>
                                            <span className="font-medium">Modo Compras</span>
                                        </button>
                                    )}
                                </div>
                                
                                {/* Ferramentas */}
                                <div className="space-y-2 mb-6">
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Ferramentas</h3>
                                    <BackupExport items={items} archivedLists={archivedLists} onImport={(items, archivedLists) => { setItems(items); setArchivedLists(archivedLists); }} showButton={true} />
                                    <Notifications items={items} showButton={true} />
                                    <AdvancedReports purchaseHistory={purchaseHistory} showButton={true} />
                                </div>
                                
                                {/* Configurações */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Configurações</h3>
                                    <DarkModeToggle />
                                    {/* Vínculo de casal */}
                                    <button
                                        onClick={() => { setIsCoupleLinkOpen(true); setIsMobileMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                    >
                                        <span className="text-2xl">💑</span>
                                        <div className="min-w-0">
                                            <p className="font-medium text-dark-gray dark:text-white text-sm">Vínculo de Casal</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Sincronizar lista com parceiro(a)</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </header>

            <main className="flex-grow container mx-auto px-2 md:px-4 py-4">
                {renderView()}
            </main>

            {/* Modals */}
            <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setAddItemModalOpen(false)}
                onSave={handleSaveItem}
                itemToEdit={itemToEdit}
                customCategories={customCategories}
            />
            {selectedCategory && (
                <CategoryModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => { setCategoryModalOpen(false); setCategoryModalAutoDelete(false); }}
                    category={selectedCategory}
                    items={itemsByCategory[selectedCategory] || []}
                    onToggleItem={toggleSelecionado}
                    onDeleteItem={deleteItem}
                    onEditItem={handleEditItem}
                    onUpdateItem={(item) => syncUpdateItem(item)}
                    onAddItem={handleAddItemFromCategory}
                    onAddNewItem={addItem}
                    autoOpenDeleteCategory={categoryModalAutoDelete}
                    onDeleteAllItems={() => {
                        // Excluir da lista local + Supabase
                        const toDelete = (itemsByCategory[selectedCategory] || []);
                        toDelete.forEach(i => syncDeleteItem(i.id));
                    }}
                    onDeleteCategory={
                        customCategories.some(c => c.name === selectedCategory)
                            ? (mode: 'move' | 'delete') => {
                                const catItems = itemsByCategory[selectedCategory] || [];
                                if (mode === 'move') {
                                    catItems.forEach(i => syncUpdateItem({ ...i, categoria: Category.OUTROS }));
                                } else {
                                    catItems.forEach(i => syncDeleteItem(i.id));
                                }
                                setCustomCategories(prev =>
                                    prev.filter(c => c.name !== selectedCategory)
                                );
                            }
                            : undefined
                    }
                />
            )}
            
            <footer className="bg-white dark:bg-dark-card p-4 shadow-t-md mt-auto" style={{paddingBottom: 'max(16px, env(safe-area-inset-bottom))'}}>
                <div className="container mx-auto text-center md:flex justify-between items-center gap-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {purchasedItems} / {totalItems} itens comprados
                    </p>
                    {totalEstimado > 0 && (
                        <p className="text-sm font-semibold text-mint-dark mt-1 md:mt-0">
                            Restante: R$ {totalEstimado.toFixed(2)}
                        </p>
                    )}
                    <div className="mt-2 md:mt-0">
                        {purchasedItems > 0 && <button onClick={handleArchiveList} className="text-sm text-blue-500 hover:underline">Arquivar e Limpar Comprados</button>}
                    </div>
                </div>
            </footer>
            
            {/* Modal Criar Nova Categoria */}
            {isCreateCategoryModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-dark-gray dark:text-light-gray">
                                ➕ Nova Categoria
                            </h2>
                            <button
                                onClick={() => { setIsCreateCategoryModalOpen(false); setNewCategoryName(''); setNewCategoryIcon('🏷️'); }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Escolha do emoji */}
                            <div>
                                <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                                    Ícone
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['🏷️','🐾','👶','💊','🔧','📦','🎮','🌿','🧸','🍕','🥗','🚗','🏠','💄','🎨','🧘','⚽','📚','🎵','💻'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setNewCategoryIcon(emoji)}
                                            className={`text-2xl p-2 rounded-lg border-2 transition-all ${newCategoryIcon === emoji ? 'border-mint bg-mint/10 scale-110' : 'border-transparent hover:border-gray-300'}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                {/* Campo livre para digitar emoji */}
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Ou digite:</span>
                                    <input
                                        type="text"
                                        value={newCategoryIcon}
                                        onChange={(e) => setNewCategoryIcon(e.target.value.slice(-2) || '🏷️')}
                                        className="w-16 text-center text-2xl px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        maxLength={2}
                                    />
                                </div>
                            </div>

                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                                    Nome da Categoria
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoryName.trim()) {
                                            const newCat: CustomCategory = {
                                                id: Date.now().toString(),
                                                name: newCategoryName.trim(),
                                                icon: newCategoryIcon,
                                                color: 'bg-mint',
                                            };
                                            setCustomCategories(prev => [...prev, newCat]);
                                            setIsCreateCategoryModalOpen(false);
                                            setNewCategoryName('');
                                            setNewCategoryIcon('🏷️');
                                        }
                                    }}
                                    placeholder="Ex: Produtos Pet, Bebê, Eletrônicos..."
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-mint dark:bg-gray-700 dark:text-white"
                                    autoFocus
                                />
                            </div>

                            {/* Preview */}
                            {newCategoryName.trim() && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-2xl">{newCategoryIcon}</span>
                                    <span className="font-semibold">{newCategoryName}</span>
                                    <span className="text-xs text-gray-500 ml-auto">Preview</span>
                                </div>
                            )}

                            <div className="flex space-x-2 pt-2">
                                <button
                                    onClick={() => {
                                        if (newCategoryName.trim()) {
                                            const newCat: CustomCategory = {
                                                id: Date.now().toString(),
                                                name: newCategoryName.trim(),
                                                icon: newCategoryIcon,
                                                color: 'bg-mint',
                                            };
                                            setCustomCategories(prev => [...prev, newCat]);
                                            setIsCreateCategoryModalOpen(false);
                                            setNewCategoryName('');
                                            setNewCategoryIcon('🏷️');
                                        }
                                    }}
                                    disabled={!newCategoryName.trim()}
                                    className="flex-1 bg-mint hover:bg-mint-dark disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors font-medium"
                                >
                                    Criar Categoria
                                </button>
                                <button
                                    onClick={() => { setIsCreateCategoryModalOpen(false); setNewCategoryName(''); setNewCategoryIcon('🏷️'); }}
                                    className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Comandos de Voz (movido para o header) ───────────────── */}

            {/* Modal Vínculo de Casal */}
            {isCoupleLinkOpen && (
                <CoupleLink
                    userId={userId}
                    onClose={() => setIsCoupleLinkOpen(false)}
                />
            )}
        </div>
    );
}

export default App;