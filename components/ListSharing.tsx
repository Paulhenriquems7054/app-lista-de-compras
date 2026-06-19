import React, { useState } from 'react';
import { Item } from '../types';

interface SharedList {
  id: string;
  name: string;
  items: Item[];
  createdAt: string;
  expiresAt: string;
  isPublic: boolean;
  shareCode: string;
  owner: string;
}

interface ListSharingProps {
  items: Item[];
  onLoadSharedList: (items: Item[]) => void;
}

export const ListSharing: React.FC<ListSharingProps> = ({ items, onLoadSharedList }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'import'>('share');
  const [shareListName, setShareListName] = useState('');
  const [shareExpiry, setShareExpiry] = useState('7'); // dias
  const [isPublic, setIsPublic] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);

  // Gerar código de compartilhamento
  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Compartilhar lista
  const shareList = () => {
    if (!shareListName.trim()) {
      alert('Digite um nome para a lista!');
      return;
    }

    const code = generateShareCode();
    const sharedList: SharedList = {
      id: Date.now().toString(),
      name: shareListName,
      items: items.filter(item => !item.comprado), // Apenas itens pendentes
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + parseInt(shareExpiry) * 24 * 60 * 60 * 1000).toISOString(),
      isPublic,
      shareCode: code,
      owner: 'Você'
    };

    // Salvar no localStorage (simulando servidor)
    const existingLists = JSON.parse(localStorage.getItem('sharedLists') || '[]');
    existingLists.push(sharedList);
    localStorage.setItem('sharedLists', JSON.stringify(existingLists));

    setShareCode(code);
    setSharedLists(existingLists);
    
    // Copiar link para clipboard
    const shareUrl = `${window.location.origin}?share=${code}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`✅ Lista compartilhada!\n\nCódigo: ${code}\nLink copiado para a área de transferência.`);
    });
  };

  // Carregar lista compartilhada
  const loadSharedList = (code: string) => {
    const existingLists = JSON.parse(localStorage.getItem('sharedLists') || '[]');
    const sharedList = existingLists.find((list: SharedList) => list.shareCode === code);
    
    if (!sharedList) {
      alert('Código de compartilhamento inválido ou expirado!');
      return;
    }

    const expired = new Date(sharedList.expiresAt) < new Date();
    if (expired) {
      alert('Esta lista expirou!');
      return;
    }

    const confirmed = window.confirm(
      `Carregar lista "${sharedList.name}"?\n\n` +
      `Itens: ${sharedList.items.length}\n` +
      `Criada por: ${sharedList.owner}\n` +
      `Data: ${new Date(sharedList.createdAt).toLocaleDateString('pt-BR')}\n\n` +
      'Isso substituirá sua lista atual!'
    );

    if (confirmed) {
      onLoadSharedList(sharedList.items);
      alert('✅ Lista carregada com sucesso!');
    }
  };

  // Listar listas compartilhadas disponíveis
  const loadAvailableLists = () => {
    const existingLists = JSON.parse(localStorage.getItem('sharedLists') || '[]');
    const now = new Date();
    
    // Filtrar listas não expiradas
    const availableLists = existingLists.filter((list: SharedList) => 
      new Date(list.expiresAt) > now
    );
    
    setSharedLists(availableLists);
  };

  // Remover lista compartilhada
  const removeSharedList = (id: string) => {
    const existingLists = JSON.parse(localStorage.getItem('sharedLists') || '[]');
    const updatedLists = existingLists.filter((list: SharedList) => list.id !== id);
    localStorage.setItem('sharedLists', JSON.stringify(updatedLists));
    setSharedLists(updatedLists);
  };

  // Compartilhar via WhatsApp
  const shareViaWhatsApp = (code: string) => {
    const shareUrl = `${window.location.origin}?share=${code}`;
    const message = `🛒 Compartilhando minha lista de compras!\n\nAcesse: ${shareUrl}\n\nCódigo: ${code}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Compartilhar via Email
  const shareViaEmail = (code: string) => {
    const shareUrl = `${window.location.origin}?share=${code}`;
    const subject = 'Lista de Compras Compartilhada';
    const body = `Olá!\n\nCompartilho minha lista de compras com você:\n\nAcesse: ${shareUrl}\nCódigo: ${code}\n\nAbraços!`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Botão para abrir modal */}
      <button
        onClick={() => {
          setIsModalOpen(true);
          loadAvailableLists();
        }}
        className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-xs md:text-sm"
        title="Compartilhar Listas"
      >
        <span>👥</span>
        <span className="hidden sm:inline">Compartilhar</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark-gray dark:text-light-gray">
                👥 Compartilhar
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Abas */}
            <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('share')}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  activeTab === 'share'
                    ? 'bg-white dark:bg-gray-700 text-dark-gray dark:text-light-gray shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                📤 Compartilhar
              </button>
              <button
                onClick={() => {
                  setActiveTab('import');
                  loadAvailableLists();
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  activeTab === 'import'
                    ? 'bg-white dark:bg-gray-700 text-dark-gray dark:text-light-gray shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                📥 Importar
              </button>
            </div>

            {activeTab === 'share' && (
              <div className="space-y-4">
                {/* Configurações de Compartilhamento */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                      Nome da Lista
                    </label>
                    <input
                      type="text"
                      value={shareListName}
                      onChange={(e) => setShareListName(e.target.value)}
                      placeholder="Ex: Lista do Supermercado"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                      Expira em (dias)
                    </label>
                    <select
                      value={shareExpiry}
                      onChange={(e) => setShareExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="1">1 dia</option>
                      <option value="3">3 dias</option>
                      <option value="7">7 dias</option>
                      <option value="14">14 dias</option>
                      <option value="30">30 dias</option>
                    </select>
                  </div>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-dark-gray dark:text-light-gray">
                      Lista pública (aparece na lista de listas disponíveis)
                    </span>
                  </label>

                  {/* Resumo */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-dark-gray dark:text-light-gray mb-2">
                      📋 Resumo da Lista
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>📝 Total de itens: {items.length}</div>
                      <div>⏳ Itens pendentes: {items.filter(item => !item.comprado).length}</div>
                      <div>✅ Itens comprados: {items.filter(item => item.comprado).length}</div>
                      <div>📅 Expira em: {parseInt(shareExpiry)} dias</div>
                    </div>
                  </div>

                  {/* Botão Compartilhar */}
                  <button
                    onClick={shareList}
                    disabled={!shareListName.trim()}
                    className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-3 rounded-lg transition-colors font-medium"
                  >
                    🚀 Compartilhar Lista
                  </button>

                  {/* Código Gerado */}
                  {shareCode && (
                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                        ✅ Lista Compartilhada!
                      </h4>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Código:</span> 
                          <span className="font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded ml-2">
                            {shareCode}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => shareViaWhatsApp(shareCode)}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors text-sm"
                          >
                            📱 WhatsApp
                          </button>
                          <button
                            onClick={() => shareViaEmail(shareCode)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors text-sm"
                          >
                            📧 Email
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-4">
                {/* Importar por Código */}
                <div>
                  <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                    Código de Compartilhamento
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={shareCode}
                      onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white font-mono"
                    />
                    <button
                      onClick={() => loadSharedList(shareCode)}
                      disabled={!shareCode.trim()}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      Carregar
                    </button>
                  </div>
                </div>

                {/* Listas Disponíveis */}
                <div>
                  <h3 className="font-medium text-dark-gray dark:text-light-gray mb-3">
                    📋 Listas Públicas Disponíveis
                  </h3>
                  
                  {sharedLists.filter(list => list.isPublic).length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      📝 Nenhuma lista pública disponível
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {sharedLists
                        .filter(list => list.isPublic)
                        .map(list => (
                        <div key={list.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-dark-gray dark:text-light-gray">
                                {list.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {list.items.length} itens • {list.owner} • {formatDate(list.createdAt)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Expira em: {formatDate(list.expiresAt)}
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => loadSharedList(list.shareCode)}
                                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded transition-colors"
                              >
                                Carregar
                              </button>
                              <button
                                onClick={() => removeSharedList(list.id)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
