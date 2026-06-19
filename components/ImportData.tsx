import React, { useState } from 'react';
import { Item, Category } from '../types';

interface ImportDataProps {
  onImport: (items: Item[]) => void;
  showButton?: boolean;
}

interface ImportResult {
  success: number;
  errors: string[];
  items: Item[];
}

export const ImportData: React.FC<ImportDataProps> = ({ onImport, showButton = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importType, setImportType] = useState<'csv' | 'json' | 'text' | 'xlsx'>('csv');
  const [textInput, setTextInput] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mapear strings para categorias
  const mapToCategory = (categoryStr: string): Category => {
    const normalized = categoryStr.toLowerCase().trim();
    
    const categoryMap: Record<string, Category> = {
      'frutas': Category.FRUTAS_E_VERDURAS,
      'verduras': Category.FRUTAS_E_VERDURAS,
      'legumes': Category.FRUTAS_E_VERDURAS,
      'carnes': Category.CARNES_E_FRIOS,
      'frios': Category.CARNES_E_FRIOS,
      'carne': Category.CARNES_E_FRIOS,
      'laticínios': Category.LATICINIOS,
      'leite': Category.LATICINIOS,
      'queijo': Category.LATICINIOS,
      'padaria': Category.PADARIA,
      'pão': Category.PADARIA,
      'mercearia': Category.MERCEARIA,
      'limpeza': Category.LIMPEZA,
      'higiene': Category.HIGIENE_PESSOAL,
      'bebidas': Category.BEBIDAS,
      'bebida': Category.BEBIDAS,
      'outros': Category.OUTROS
    };

    for (const [key, category] of Object.entries(categoryMap)) {
      if (normalized.includes(key)) {
        return category;
      }
    }

    return Category.OUTROS;
  };

  // Importar CSV
  const importCSV = (content: string): ImportResult => {
    const lines = content.split('\n').filter(line => line.trim());
    const result: ImportResult = { success: 0, errors: [], items: [] };

    // Detectar se tem cabeçalho
    const hasHeader = lines[0].toLowerCase().includes('nome') || 
                     lines[0].toLowerCase().includes('item') ||
                     lines[0].toLowerCase().includes('produto');
    
    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, index) => {
      try {
        // Suportar vírgula ou ponto-e-vírgula
        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map(p => p.trim().replace(/['"]/g, ''));

        if (parts.length < 1 || !parts[0]) {
          result.errors.push(`Linha ${index + 1}: Linha vazia ou inválida`);
          return;
        }

        const item: Item = {
          id: Date.now().toString() + Math.random(),
          nome: parts[0],
          quantidade: parts[1] || '1',
          categoria: parts[2] ? mapToCategory(parts[2]) : Category.OUTROS,
          comprado: false,
          frequencia: 1,
          ultima_compra: new Date().toISOString(),
          preco_medio: parts[3] ? parseFloat(parts[3]) : undefined
        };

        result.items.push(item);
        result.success++;
      } catch (error) {
        result.errors.push(`Linha ${index + 1}: ${(error as Error).message}`);
      }
    });

    return result;
  };

  // Importar JSON
  const importJSON = (content: string): ImportResult => {
    const result: ImportResult = { success: 0, errors: [], items: [] };

    try {
      const data = JSON.parse(content);
      
      // Detectar formato do JSON
      let itemsArray: any[] = [];
      
      if (Array.isArray(data)) {
        itemsArray = data;
      } else if (data.items && Array.isArray(data.items)) {
        itemsArray = data.items;
      } else if (data.lista && Array.isArray(data.lista)) {
        itemsArray = data.lista;
      } else {
        result.errors.push('Formato JSON não reconhecido. Use um array ou objeto com propriedade "items".');
        return result;
      }

      itemsArray.forEach((itemData, index) => {
        try {
          const item: Item = {
            id: itemData.id || (Date.now().toString() + Math.random()),
            nome: itemData.nome || itemData.name || itemData.produto || itemData.item,
            quantidade: itemData.quantidade?.toString() || itemData.quantity?.toString() || '1',
            categoria: itemData.categoria ? mapToCategory(itemData.categoria) : 
                      itemData.category ? mapToCategory(itemData.category) : Category.OUTROS,
            comprado: itemData.comprado || itemData.checked || false,
            frequencia: itemData.frequencia || itemData.frequency || 1,
            ultima_compra: itemData.ultima_compra || itemData.last_purchase || new Date().toISOString(),
            preco_medio: itemData.preco_medio || itemData.price || itemData.preco,
            historico_precos: itemData.historico_precos || itemData.price_history,
            dias_entre_compras: itemData.dias_entre_compras || itemData.days_between_purchases
          };

          if (!item.nome) {
            result.errors.push(`Item ${index + 1}: Nome não encontrado`);
            return;
          }

          result.items.push(item);
          result.success++;
        } catch (error) {
          result.errors.push(`Item ${index + 1}: ${(error as Error).message}`);
        }
      });

    } catch (error) {
      result.errors.push(`Erro ao processar JSON: ${(error as Error).message}`);
    }

    return result;
  };

  // Importar texto simples (lista de itens)
  const importText = (content: string): ImportResult => {
    const lines = content.split('\n').filter(line => line.trim());
    const result: ImportResult = { success: 0, errors: [], items: [] };

    lines.forEach((line, index) => {
      try {
        const cleanLine = line.trim().replace(/^[-*•]\s*/, ''); // Remove bullets
        
        if (!cleanLine) return;

        // Tentar extrair quantidade (ex: "2 Leites", "Pão (3)")
        let nome = cleanLine;
        let quantidade = '1';

        const qtyMatch = cleanLine.match(/^(\d+)\s+(.+)/) || 
                        cleanLine.match(/(.+)\s+\((\d+)\)/) ||
                        cleanLine.match(/(.+)\s+-\s+(\d+)/);

        if (qtyMatch) {
          if (qtyMatch[1] && qtyMatch[2]) {
            quantidade = qtyMatch[1].match(/^\d+$/) ? qtyMatch[1] : qtyMatch[2];
            nome = qtyMatch[1].match(/^\d+$/) ? qtyMatch[2] : qtyMatch[1];
          }
        }

        const item: Item = {
          id: Date.now().toString() + Math.random(),
          nome: nome.trim(),
          quantidade,
          categoria: mapToCategory(nome),
          comprado: false,
          frequencia: 1,
          ultima_compra: new Date().toISOString()
        };

        result.items.push(item);
        result.success++;
      } catch (error) {
        result.errors.push(`Linha ${index + 1}: ${(error as Error).message}`);
      }
    });

    return result;
  };

  // Processar arquivo
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let result: ImportResult;

        const fileExt = file.name.split('.').pop()?.toLowerCase();

        switch (fileExt) {
          case 'json':
            result = importJSON(content);
            break;
          case 'csv':
            result = importCSV(content);
            break;
          case 'txt':
            result = importText(content);
            break;
          default:
            // Tentar detectar formato pelo conteúdo
            if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
              result = importJSON(content);
            } else if (content.includes(',') || content.includes(';')) {
              result = importCSV(content);
            } else {
              result = importText(content);
            }
        }

        setImportResult(result);
        setIsLoading(false);

        if (result.success > 0) {
          const confirmed = window.confirm(
            `✅ Importação concluída!\n\n` +
            `Itens importados: ${result.success}\n` +
            `Erros: ${result.errors.length}\n\n` +
            `Deseja adicionar estes itens à sua lista?`
          );

          if (confirmed) {
            onImport(result.items);
            setIsModalOpen(false);
            setImportResult(null);
          }
        }
      } catch (error) {
        alert(`Erro ao processar arquivo: ${(error as Error).message}`);
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      alert('Erro ao ler arquivo');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  // Processar texto colado
  const handleTextImport = () => {
    if (!textInput.trim()) {
      alert('Digite ou cole o conteúdo para importar');
      return;
    }

    setIsLoading(true);
    let result: ImportResult;

    // Detectar formato
    if (textInput.trim().startsWith('{') || textInput.trim().startsWith('[')) {
      result = importJSON(textInput);
    } else if (textInput.includes(',') || textInput.includes(';')) {
      result = importCSV(textInput);
    } else {
      result = importText(textInput);
    }

    setImportResult(result);
    setIsLoading(false);

    if (result.success > 0) {
      const confirmed = window.confirm(
        `✅ Importação concluída!\n\n` +
        `Itens importados: ${result.success}\n` +
        `Erros: ${result.errors.length}\n\n` +
        `Deseja adicionar estes itens à sua lista?`
      );

      if (confirmed) {
        onImport(result.items);
        setIsModalOpen(false);
        setImportResult(null);
        setTextInput('');
      }
    }
  };

  // Templates de exemplo
  const getExampleTemplate = () => {
    switch (importType) {
      case 'csv':
        return `Nome,Quantidade,Categoria,Preço
Leite,2,Laticínios,5.50
Pão,3,Padaria,4.00
Banana,1kg,Frutas,6.90
Detergente,2,Limpeza,3.50`;
      
      case 'json':
        return `{
  "items": [
    {
      "nome": "Leite",
      "quantidade": "2",
      "categoria": "Laticínios",
      "preco_medio": 5.50
    },
    {
      "nome": "Pão",
      "quantidade": "3",
      "categoria": "Padaria",
      "preco_medio": 4.00
    }
  ]
}`;
      
      case 'text':
        return `Leite
2 Pães
Banana (1kg)
Detergente - 2
Café
Arroz`;
      
      default:
        return '';
    }
  };

  return (
    <>
      {/* Botão para abrir modal - só renderiza se showButton for true */}
      {showButton && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-xs md:text-sm w-full"
          title="Importar Dados Externos"
        >
          <span>📥</span>
          <span className="font-medium">Importar</span>
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark-gray dark:text-light-gray">
                📥 Importar Dados
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setImportResult(null);
                  setTextInput('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Seletor de Tipo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                Formato de Importação
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setImportType('csv')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    importType === 'csv'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-sm font-medium">CSV</div>
                </button>
                <button
                  onClick={() => setImportType('json')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    importType === 'json'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📋</div>
                  <div className="text-sm font-medium">JSON</div>
                </button>
                <button
                  onClick={() => setImportType('text')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    importType === 'text'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-sm font-medium">Texto</div>
                </button>
                <button
                  onClick={() => setImportType('xlsx')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    importType === 'xlsx'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled
                  title="Em breve"
                >
                  <div className="text-2xl mb-1 opacity-50">📑</div>
                  <div className="text-sm font-medium opacity-50">Excel</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Área de Importação */}
              <div className="space-y-4">
                <h3 className="font-semibold text-dark-gray dark:text-light-gray">
                  📂 Importar Arquivo ou Texto
                </h3>

                {/* Upload de arquivo */}
                <div>
                  <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                    Selecionar Arquivo
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileImport}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-white hover:file:bg-orange-600"
                  />
                </div>

                <div className="text-center text-gray-500 dark:text-gray-400 font-medium">
                  OU
                </div>

                {/* Área de texto */}
                <div>
                  <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                    Colar Texto
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`Cole aqui seu ${importType === 'csv' ? 'CSV' : importType === 'json' ? 'JSON' : 'texto'}...`}
                    disabled={isLoading}
                    className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={handleTextImport}
                    disabled={isLoading || !textInput.trim()}
                    className="mt-2 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-2 rounded-lg transition-colors font-medium"
                  >
                    {isLoading ? '⏳ Processando...' : '📥 Importar Texto'}
                  </button>
                </div>
              </div>

              {/* Área de Exemplo */}
              <div className="space-y-4">
                <h3 className="font-semibold text-dark-gray dark:text-light-gray">
                  💡 Exemplo de Formato
                </h3>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                    {getExampleTemplate()}
                  </pre>
                </div>

                {/* Instruções */}
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    📖 Instruções
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    {importType === 'csv' && (
                      <>
                        <li>• Use vírgula (,) ou ponto-e-vírgula (;)</li>
                        <li>• Colunas: Nome, Quantidade, Categoria, Preço</li>
                        <li>• Cabeçalho é opcional</li>
                      </>
                    )}
                    {importType === 'json' && (
                      <>
                        <li>• Use formato JSON válido</li>
                        <li>• Array direto ou objeto com "items"</li>
                        <li>• Campos: nome, quantidade, categoria, preco_medio</li>
                      </>
                    )}
                    {importType === 'text' && (
                      <>
                        <li>• Um item por linha</li>
                        <li>• Quantidade: "2 Leites" ou "Leite (2)"</li>
                        <li>• Categoria detectada automaticamente</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Categorias Reconhecidas */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-dark-gray dark:text-light-gray mb-2">
                    🏷️ Categorias Reconhecidas
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>🍎 Frutas e Verduras</div>
                    <div>🥩 Carnes e Frios</div>
                    <div>🥛 Laticínios</div>
                    <div>🍞 Padaria</div>
                    <div>🛒 Mercearia</div>
                    <div>🧹 Limpeza</div>
                    <div>🧴 Higiene Pessoal</div>
                    <div>🥤 Bebidas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado da Importação */}
            {importResult && (
              <div className={`mt-6 p-4 rounded-lg ${
                importResult.success > 0 
                  ? 'bg-green-50 dark:bg-green-900' 
                  : 'bg-red-50 dark:bg-red-900'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  importResult.success > 0 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {importResult.success > 0 ? '✅ Importação Concluída' : '❌ Erro na Importação'}
                </h4>
                
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    ✅ Itens importados: {importResult.success}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div>
                      <div className="font-medium text-red-600 dark:text-red-300 mt-2">
                        ❌ Erros ({importResult.errors.length}):
                      </div>
                      <div className="max-h-32 overflow-y-auto text-xs mt-1">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="text-red-700 dark:text-red-300">
                            • {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview dos itens */}
                {importResult.items.length > 0 && (
                  <div className="mt-3">
                    <div className="font-medium mb-2">📋 Itens a Importar:</div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {importResult.items.slice(0, 10).map((item, index) => (
                        <div key={index} className="text-sm bg-white dark:bg-gray-700 p-2 rounded">
                          {item.nome} • {item.quantidade} • {item.categoria}
                          {item.preco_medio && ` • R$ ${item.preco_medio.toFixed(2)}`}
                        </div>
                      ))}
                      {importResult.items.length > 10 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          ... e mais {importResult.items.length - 10} itens
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
