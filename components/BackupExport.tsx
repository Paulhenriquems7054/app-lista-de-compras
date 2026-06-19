import React, { useState } from 'react';
import { Item, ArchivedList } from '../types';

interface BackupExportProps {
  items: Item[];
  archivedLists: ArchivedList[];
  onImport: (items: Item[], archivedLists: ArchivedList[]) => void;
  showButton?: boolean;
}

export const BackupExport: React.FC<BackupExportProps> = ({ items, archivedLists, onImport, showButton = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importError, setImportError] = useState('');

  // Exportar dados para JSON
  const exportData = () => {
    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      items,
      archivedLists,
      metadata: {
        totalItems: items.length,
        totalArchivedLists: archivedLists.length,
        appVersion: '1.0.0'
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-compras-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar para CSV
  const exportCSV = () => {
    const csvContent = [
      ['Nome', 'Quantidade', 'Categoria', 'Comprado', 'Frequência', 'Última Compra', 'Preço Médio'],
      ...items.map(item => [
        item.nome,
        item.quantidade,
        item.categoria,
        item.comprado ? 'Sim' : 'Não',
        item.frequencia.toString(),
        item.ultima_compra ? new Date(item.ultima_compra).toLocaleDateString('pt-BR') : '',
        item.preco_medio ? `R$ ${item.preco_medio.toFixed(2)}` : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-compras-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar dados
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validar estrutura dos dados
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Formato de arquivo inválido');
        }

        // Confirmar importação
        const confirmed = window.confirm(
          `Importar ${data.items.length} itens e ${data.archivedLists?.length || 0} listas arquivadas?\n\n` +
          'Isso substituirá todos os dados atuais!'
        );

        if (confirmed) {
          onImport(data.items || [], data.archivedLists || []);
          setImportError('');
          setIsModalOpen(false);
        }
      } catch (error) {
        setImportError('Erro ao importar arquivo. Verifique se é um arquivo de backup válido.');
        console.error('Erro na importação:', error);
      }
    };
    reader.readAsText(file);
  };

  // Backup automático no localStorage
  const createAutomaticBackup = () => {
    const backup = {
      timestamp: Date.now(),
      items,
      archivedLists
    };
    
    // Manter últimos 5 backups
    const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
    backups.push(backup);
    
    if (backups.length > 5) {
      backups.shift(); // Remove o mais antigo
    }
    
    localStorage.setItem('autoBackups', JSON.stringify(backups));
    console.log('✅ Backup automático criado');
  };

  // Restaurar backup automático
  const restoreAutomaticBackup = () => {
    const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
    
    if (backups.length === 0) {
      alert('Nenhum backup automático encontrado');
      return;
    }

    // Mostrar lista de backups
    const backupList = backups.map((backup: any, index: number) => 
      `${index + 1}. ${new Date(backup.timestamp).toLocaleString('pt-BR')} (${backup.items.length} itens)`
    ).join('\n');

    const choice = prompt(
      `Backups disponíveis:\n${backupList}\n\nDigite o número do backup para restaurar:`
    );

    const backupIndex = parseInt(choice || '') - 1;
    if (backupIndex >= 0 && backupIndex < backups.length) {
      const confirmed = window.confirm(
        `Restaurar backup de ${new Date(backups[backupIndex].timestamp).toLocaleString('pt-BR')}?\n\n` +
        'Isso substituirá todos os dados atuais!'
      );

      if (confirmed) {
        onImport(backups[backupIndex].items, backups[backupIndex].archivedLists);
        alert('✅ Backup restaurado com sucesso!');
      }
    }
  };

  return (
    <>
      {/* Botão para abrir modal - só renderiza se showButton for true */}
      {showButton && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs md:text-sm w-full"
          title="Backup e Export"
        >
          <span>💾</span>
          <span className="font-medium">Backup</span>
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark-gray dark:text-light-gray">
                💾 Backup e Export
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Exportar */}
              <div className="space-y-2">
                <h3 className="font-semibold text-dark-gray dark:text-light-gray">📤 Exportar</h3>
                
                <button
                  onClick={exportData}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <span>📄</span>
                  <span>Exportar JSON (Backup Completo)</span>
                </button>

                <button
                  onClick={exportCSV}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <span>📊</span>
                  <span>Exportar CSV (Lista Atual)</span>
                </button>
              </div>

              {/* Importar */}
              <div className="space-y-2">
                <h3 className="font-semibold text-dark-gray dark:text-light-gray">📥 Importar</h3>
                
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <div className="w-full flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors cursor-pointer">
                    <span>📁</span>
                    <span>Importar Backup JSON</span>
                  </div>
                </label>

                {importError && (
                  <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900 p-2 rounded">
                    {importError}
                  </div>
                )}
              </div>

              {/* Backup Automático */}
              <div className="space-y-2">
                <h3 className="font-semibold text-dark-gray dark:text-light-gray">🔄 Backup Automático</h3>
                
                <button
                  onClick={createAutomaticBackup}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                >
                  <span>💾</span>
                  <span>Criar Backup Automático</span>
                </button>

                <button
                  onClick={restoreAutomaticBackup}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <span>🔄</span>
                  <span>Restaurar Backup Automático</span>
                </button>
              </div>

              {/* Estatísticas */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <h4 className="font-semibold text-dark-gray dark:text-light-gray mb-2">📊 Estatísticas</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>📝 Itens na lista: {items.length}</div>
                  <div>📦 Listas arquivadas: {archivedLists.length}</div>
                  <div>✅ Itens comprados: {items.filter(item => item.comprado).length}</div>
                  <div>⏳ Itens pendentes: {items.filter(item => !item.comprado).length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
