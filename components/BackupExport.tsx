import React, { useState, useRef } from 'react';
import { Item, ArchivedList } from '../types';

interface BackupExportProps {
  items: Item[];
  archivedLists: ArchivedList[];
  onImport: (items: Item[], archivedLists: ArchivedList[]) => void;
  showButton?: boolean;
}

export const BackupExport: React.FC<BackupExportProps> = ({
  items,
  archivedLists,
  onImport,
  showButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      items,
      archivedLists,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-compras-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const rows = [
      ['Nome', 'Quantidade', 'Unidade', 'Categoria', 'Preço', 'Local', 'Observação'],
      ...items.map(i => [
        i.nome,
        i.quantidade,
        i.unidade ?? '',
        i.categoria,
        i.precoUnitario != null ? `R$ ${i.precoUnitario.toFixed(2)}` : '',
        i.localCompra ?? '',
        i.observacao ?? '',
      ]),
    ].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-compras-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Agrupa itens por categoria
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.categoria]) acc[item.categoria] = [];
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const rows = Object.entries(grouped).map(([cat, catItems]) => `
      <tr class="cat-header">
        <td colspan="5">${cat}</td>
      </tr>
      ${catItems.map(i => `
        <tr>
          <td>${i.nome}</td>
          <td>${i.quantidade}${i.unidade ? ' ' + i.unidade : ''}</td>
          <td>${i.precoUnitario != null ? 'R$ ' + i.precoUnitario.toFixed(2) : '—'}</td>
          <td>${i.localCompra ?? '—'}</td>
          <td>${i.observacao ?? '—'}</td>
        </tr>
      `).join('')}
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Lista de Compras — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    h1  { font-size: 18px; margin-bottom: 4px; }
    .sub { font-size: 11px; color: #555; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th  { background: #f0fdf4; text-align: left; padding: 6px 8px; font-size: 11px;
          text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #16a34a; color: #166534; }
    td  { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr.cat-header td {
      background: #1e293b; color: #fff; font-weight: bold;
      padding: 5px 8px; font-size: 11px; letter-spacing: .3px;
    }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: right; }
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>🛒 Lista de Compras</h1>
  <p class="sub">Gerado em ${date} · ${items.length} itens</p>
  <table>
    <thead>
      <tr>
        <th>Produto</th><th>Qtd.</th><th>Preço</th><th>Local</th><th>Observação</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Lista de Compras — ${date}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSuccess('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.items || !Array.isArray(data.items)) throw new Error('Formato inválido');

        const confirmed = window.confirm(
          `Importar ${data.items.length} itens?\n\nIsso substituirá todos os dados atuais.`
        );
        if (confirmed) {
          onImport(data.items ?? [], data.archivedLists ?? []);
          setImportSuccess(`${data.items.length} itens importados com sucesso.`);
          setIsOpen(false);
        }
      } catch {
        setImportError('Arquivo inválido. Use um backup JSON exportado por este app.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <>
      {showButton && (
        <button
          onClick={() => { setIsOpen(true); setImportError(''); setImportSuccess(''); }}
          className="flex items-center space-x-1 px-2 md:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs md:text-sm w-full"
        >
          <span>💾</span>
          <span className="font-medium">Backup</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
              <h2 className="text-base font-bold text-dark-gray dark:text-white">📤 Backup e Exportar</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Ações */}
            <div className="p-5 space-y-3">
              <button
                onClick={exportJSON}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <span>📄</span>
                <div className="text-left">
                  <p className="font-semibold">Exportar JSON</p>
                  <p className="text-xs text-green-100">Backup completo de todos os dados</p>
                </div>
              </button>

              <button
                onClick={exportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <span>📊</span>
                <div className="text-left">
                  <p className="font-semibold">Exportar CSV</p>
                  <p className="text-xs text-blue-100">Lista atual em planilha</p>
                </div>
              </button>

              <button
                onClick={exportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <span>🖨️</span>
                <div className="text-left">
                  <p className="font-semibold">Exportar PDF</p>
                  <p className="text-xs text-red-100">Abrir diálogo de impressão / salvar como PDF</p>
                </div>
              </button>

              <label className="block cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <div className="w-full flex items-center gap-3 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium">
                  <span>📁</span>
                  <div className="text-left">
                    <p className="font-semibold">Importar JSON</p>
                    <p className="text-xs text-purple-100">Restaurar a partir de um backup</p>
                  </div>
                </div>
              </label>

              {importError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  ⚠️ {importError}
                </p>
              )}
              {importSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                  ✅ {importSuccess}
                </p>
              )}
            </div>

            {/* Footer com contagem */}
            <div className="px-5 py-3 border-t dark:border-gray-700 flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{items.length} itens na lista</span>
              <span>{archivedLists.length} listas arquivadas</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
