import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Item, Category, ArchivedList, AppView, CustomCategory, PurchaseRecord } from './types';
import { useUserStorage, migrateLeacyDataToUser } from './hooks/useUserStorage';
import { useAuth, useSession } from './contexts/AuthContext';
import { CATEGORIES } from './constants';
import { AddItemModal } from './components/AddItemModal';
import { CategoryModal } from './components/CategoryModal';
import { Icon } from './components/Icon';
import { Stats } from './components/Stats';
import { SmartInsights } from './components/SmartInsights';
import { BackupExport } from './components/BackupExport';
import { PriceBudget } from './components/PriceBudget';
import { Notifications } from './components/Notifications';
import { ListSharing } from './components/ListSharing';
import { AdvancedReports } from './components/AdvancedReports';
import { ImportData } from './components/ImportData';
import { DarkModeToggle } from './components/DarkModeToggle';
import { ShoppingMode } from './components/ShoppingMode';
import { ConsumptionDashboard } from './components/ConsumptionDashboard';
import { useConsumptionStats } from './hooks/useConsumptionStats';
import { AuthScreen } from './components/auth/AuthScreen';
import { VoiceCommandButton } from './components/VoiceCommandButton';

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
    const [items, setItems] = useUserStorage<Item[]>(userId, 'shoppingList', []);
    const [archivedLists, setArchivedLists] = useUserStorage<ArchivedList[]>(userId, 'archivedLists', []);
    const [purchaseHistory, setPurchaseHistory] = useUserStorage<PurchaseRecord[]>(userId, 'purchaseHistory', []);
    const [customCategories, setCustomCategories] = useUserStorage<CustomCategory[]>(userId, 'customCategories', []);
    const [view, setView] = useState<AppView>(AppView.LISTA);
    const [searchQuery, setSearchQuery] = useState('');

    const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [categoryForNewItem, setCategoryForNewItem] = useState<Category | null>(null);

    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️');
    const [showMenuHint, setShowMenuHint] = useState(() => {
        const hintCount = parseInt(localStorage.getItem(`${userId}:menuHintShown`) || '0');
        return hintCount < 3;
    });
    
    const addItem = (item: Item) => {
        setItems(prevItems => {
            const existingItem = prevItems.find(i => i.id === item.id);
            if (existingItem) {
                return prevItems.map(i => i.id === item.id ? { ...item, frequencia: i.frequencia + 1, ultima_compra: new Date().toISOString() } : i);
            }
            return [...prevItems, { ...item, ultima_compra: new Date().toISOString() }];
        });
    };
    
    const deleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const toggleItem = (id: string) => {
        setItems(items.map(item => item.id === id ? { ...item, comprado: !item.comprado } : item));
    };

    const handleOpenCategory = (category: Category) => {
        setSelectedCategory(category);
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

        // 1. Gerar PurchaseRecords para o histórico — ID com índice para evitar colisão
        const nowMs = Date.now();
        const newRecords: PurchaseRecord[] = purchasedItems.map((item, idx) => ({
            id: `${nowMs}-${idx}-${Math.random().toString(36).slice(2)}`,
            itemNome: item.nome.trim().toLowerCase(),
            categoria: item.categoria,
            quantidade: item.quantidade,
            precoUnitario: item.preco_medio,
            precoTotal: item.preco_medio,
            dataCompra: now,
        }));
        setPurchaseHistory(prev => [...prev, ...newRecords]);

        // 2. Calcular dias_entre_compras para cada item recém-comprado e atualizar
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

        // 3. Arquivar lista — uma única chamada setItems para evitar race condition
        setItems(prev => {
            const compradosIds = new Set(purchasedItems.map(p => p.id));
            return prev
                .map(item => {
                    const novoDias = diasMap.get(item.id);
                    if (novoDias !== undefined) {
                        return { ...item, dias_entre_compras: novoDias };
                    }
                    return item;
                })
                .filter(item => !compradosIds.has(item.id));
        });
    };
    
    const handleRepeatList = (listItems: Item[]) => {
        const itemsToRepeat = listItems.map(item => ({...item, id: new Date().getTime() + item.nome, comprado: false }));
        setItems(prev => [...prev, ...itemsToRepeat]);
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

    const consumptionStats = useConsumptionStats(purchaseHistory);

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
        const lowercasedQuery = searchQuery.toLowerCase();
        const categoryMatches = allCategories.filter(c => c.name.toLowerCase().includes(lowercasedQuery));
        const itemMatches = items.filter(i => i.nome.toLowerCase().includes(lowercasedQuery)).map(i => i.categoria);
        const matchedCategories = new Set([...categoryMatches.map(c => c.name), ...itemMatches]);
        return allCategories.filter(c => matchedCategories.has(c.name));
    }, [searchQuery, items, allCategories]);
    
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
                        items={items}
                        onToggleItem={toggleItem}
                        onDeleteItem={deleteItem}
                        onExit={() => setView(AppView.LISTA)}
                    />
                );
            case AppView.HISTORICO:
                return (
                    <div>
                        <button 
                            onClick={() => setView(AppView.LISTA)}
                            className="flex items-center gap-2 mb-4 px-4 py-2 bg-mint hover:bg-mint-dark text-white rounded-lg transition-colors"
                        >
                            <span>←</span>
                            <span>Voltar para Minhas Listas</span>
                        </button>
                        <Stats items={items} archivedLists={archivedLists} onRepeatList={handleRepeatList} />
                    </div>
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
                        <ListSharing items={items} />
                    </div>
                );
            case AppView.LISTA:
            default:
                return (
                    <div className="p-4 md:p-6">
                        {/* Botão Iniciar Compras */}
                        {items.length > 0 && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setView(AppView.COMPRAS)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-mint to-mint-dark text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all text-base"
                                >
                                    <span className="text-xl">🛒</span>
                                    Iniciar Compras ({items.filter(i => !i.comprado).length} pendentes)
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredCategories.map(({ name, icon, color, isCustom, customId }) => {
                                const categoryItems = itemsByCategory[name] || [];
                                const purchasedCount = categoryItems.filter(i => i.comprado).length;
                                // Selos: pegar dos itens desta categoria no consumptionStats
                                const categorySeals = consumptionStats.productStats
                                    .filter(p => p.categoria === name && p.selos.length > 0)
                                    .flatMap(p => p.selos);
                                const uniqueSeals = [...new Set(categorySeals)].slice(0, 3);
                                return (
                                    <div key={name} className="relative group">
                                        <div
                                            onClick={() => handleOpenCategory(name)}
                                            className="relative p-4 rounded-lg shadow-md cursor-pointer transform hover:scale-105 transition-transform duration-200 bg-white dark:bg-dark-card h-full"
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
                                        {/* Botão excluir para categorias personalizadas */}
                                        {isCustom && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Excluir a categoria "${name}"? Os itens dela serão movidos para Outros.`)) {
                                                        // Mover itens para Outros
                                                        setItems(prev => prev.map(i =>
                                                            i.categoria === name ? { ...i, categoria: Category.OUTROS } : i
                                                        ));
                                                        setCustomCategories(prev => prev.filter(c => c.id !== customId));
                                                    }
                                                }}
                                                className="absolute -top-2 -left-2 hidden group-hover:flex w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors z-10"
                                                title="Excluir categoria"
                                            >
                                                ✕
                                            </button>
                                        )}
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
                            <h1>Lista de Compras</h1>
                            {nomeCasal && (
                                <p className="text-xs text-mint-dark dark:text-mint opacity-90 font-medium truncate max-w-[160px]">
                                    👫 {nomeCasal}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Linha 2: Campo de Busca */}
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
                                    <ImportData onImport={setItems} showButton={true} />
                                    <BackupExport items={items} archivedLists={archivedLists} onImport={(items, archivedLists) => { setItems(items); setArchivedLists(archivedLists); }} showButton={true} />
                                    <PriceBudget items={items} onUpdateItems={setItems} showButton={true} />
                                    <Notifications items={items} showButton={true} />
                                    <AdvancedReports items={items} archivedLists={archivedLists} showButton={true} />
                                </div>
                                
                                {/* Configurações */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Configurações</h3>
                                    <DarkModeToggle />
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
                    onClose={() => setCategoryModalOpen(false)}
                    category={selectedCategory}
                    items={itemsByCategory[selectedCategory] || []}
                    onToggleItem={toggleItem}
                    onDeleteItem={deleteItem}
                    onEditItem={handleEditItem}
                    onAddItem={handleAddItemFromCategory}
                    onAddNewItem={addItem}
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

            {/* ── Comandos de Voz ───────────────────────────────────────── */}
            <VoiceCommandButton
                context={{
                    items,
                    customCategories,
                    addItem,
                    updateItem: (id, changes) => setItems(prev =>
                        prev.map(i => i.id === id ? { ...i, ...changes } : i)
                    ),
                    deleteItem,
                    toggleItem,
                    addCustomCategory: (cat) => setCustomCategories(prev => [...prev, cat]),
                    removeCustomCategory: (id) => {
                        setItems(prev => prev.map(i =>
                            i.categoria === customCategories.find(c => c.id === id)?.name
                                ? { ...i, categoria: Category.OUTROS }
                                : i
                        ));
                        setCustomCategories(prev => prev.filter(c => c.id !== id));
                    },
                }}
            />
        </div>
    );
}

export default App;