import React, { useState, useEffect } from 'react';
import { Item } from '../types';

interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // HH:MM
  reminderDays: number[]; // 0-6 (domingo-sábado)
  shoppingDayReminder: boolean;
  lowStockReminder: boolean;
  priceAlertReminder: boolean;
}

interface NotificationsProps {
  items: Item[];
  showButton?: boolean;
}

export const Notifications: React.FC<NotificationsProps> = ({ items, showButton = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    reminderTime: '09:00',
    reminderDays: [0, 6], // Domingo e sábado
    shoppingDayReminder: true,
    lowStockReminder: true,
    priceAlertReminder: false
  });

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Salvar configurações
  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  // Solicitar permissão de notificação
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        saveSettings({ ...settings, enabled: true });
        showTestNotification();
      } else {
        alert('Permissão de notificação negada. Você pode habilitar nas configurações do navegador.');
      }
    } else {
      alert('Seu navegador não suporta notificações.');
    }
  };

  // Mostrar notificação de teste
  const showTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Lista de Compras IA', {
        body: 'Notificações ativadas com sucesso! 🎉',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'test-notification'
      });
    }
  };

  // Verificar se é dia de compras
  const isShoppingDay = () => {
    const today = new Date().getDay();
    return settings.reminderDays.includes(today);
  };

  // Verificar se é hora de lembrar
  const isReminderTime = () => {
    const now = new Date();
    const [hours, minutes] = settings.reminderTime.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    
    const timeDiff = now.getTime() - reminderTime.getTime();
    return timeDiff >= 0 && timeDiff < 60000; // Dentro de 1 minuto
  };

  // Verificar itens com baixo estoque (baseado na frequência)
  const getLowStockItems = () => {
    return items.filter(item => {
      if (!item.ultima_compra || !item.dias_entre_compras) return false;
      
      const lastPurchase = new Date(item.ultima_compra);
      const daysSinceLastPurchase = Math.floor(
        (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return daysSinceLastPurchase >= item.dias_entre_compras;
    });
  };

  // Enviar notificação
  const sendNotification = (title: string, body: string, tag?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag,
        requireInteraction: true
      });
    }
  };

  // Verificar lembretes (executar periodicamente)
  useEffect(() => {
    if (!settings.enabled) return;

    const checkReminders = () => {
      // Lembrete de dia de compras
      if (settings.shoppingDayReminder && isShoppingDay() && isReminderTime()) {
        const pendingItems = items.filter(item => !item.comprado);
        if (pendingItems.length > 0) {
          sendNotification(
            '🛒 Dia de Compras!',
            `Você tem ${pendingItems.length} itens na sua lista de compras.`,
            'shopping-day'
          );
        }
      }

      // Lembrete de baixo estoque
      if (settings.lowStockReminder) {
        const lowStockItems = getLowStockItems();
        if (lowStockItems.length > 0) {
          sendNotification(
            '⚠️ Baixo Estoque',
            `${lowStockItems.length} itens podem estar acabando: ${lowStockItems.slice(0, 3).map(item => item.nome).join(', ')}`,
            'low-stock'
          );
        }
      }
    };

    // Verificar a cada minuto
    const interval = setInterval(checkReminders, 60000);
    checkReminders(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [settings, items]);

  // Agendar lembrete específico
  const scheduleReminder = (title: string, body: string, delay: number) => {
    setTimeout(() => {
      if (settings.enabled) {
        sendNotification(title, body, 'scheduled-reminder');
      }
    }, delay);
  };

  // Testar diferentes tipos de notificação
  const testNotifications = () => {
    if (!settings.enabled) {
      alert('Ative as notificações primeiro!');
      return;
    }

    sendNotification('🛒 Teste - Dia de Compras', 'Você tem 5 itens na sua lista de compras.');
    
    setTimeout(() => {
      sendNotification('⚠️ Teste - Baixo Estoque', 'Leite, pão e ovos podem estar acabando.');
    }, 2000);

    setTimeout(() => {
      sendNotification('💰 Teste - Alerta de Preço', 'Leite está com desconto de 20%!');
    }, 4000);
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <>
      {/* Botão para abrir modal - só renderiza se showButton for true */}
      {showButton && (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center space-x-1 px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm w-full ${
            settings.enabled 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
          title="Notificações e Lembretes"
        >
          <span>🔔</span>
          <span className="font-medium">Notificações</span>
          {settings.enabled && (
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
          )}
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-dark-gray dark:text-light-gray">
                🔔 Notificações
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Status das Notificações */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-dark-gray dark:text-light-gray">
                      Status das Notificações
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {Notification.permission === 'granted' ? '✅ Permitido' :
                       Notification.permission === 'denied' ? '❌ Negado' :
                       '⚠️ Não solicitado'}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    settings.enabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
              </div>

              {/* Habilitar/Desabilitar */}
              <div className="flex items-center justify-between">
                <span className="text-dark-gray dark:text-light-gray">Ativar Notificações</span>
                <button
                  onClick={() => {
                    if (settings.enabled) {
                      saveSettings({ ...settings, enabled: false });
                    } else {
                      requestNotificationPermission();
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    settings.enabled 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {settings.enabled ? 'Desativar' : 'Ativar'}
                </button>
              </div>

              {settings.enabled && (
                <>
                  {/* Horário do Lembrete */}
                  <div>
                    <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                      Horário do Lembrete
                    </label>
                    <input
                      type="time"
                      value={settings.reminderTime}
                      onChange={(e) => saveSettings({ ...settings, reminderTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Dias da Semana */}
                  <div>
                    <label className="block text-sm font-medium text-dark-gray dark:text-light-gray mb-2">
                      Dias de Lembrete
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const newDays = settings.reminderDays.includes(index)
                              ? settings.reminderDays.filter(d => d !== index)
                              : [...settings.reminderDays, index];
                            saveSettings({ ...settings, reminderDays: newDays });
                          }}
                          className={`p-2 text-xs rounded-lg transition-colors ${
                            settings.reminderDays.includes(index)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tipos de Lembrete */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-dark-gray dark:text-light-gray">
                      Tipos de Lembrete
                    </h3>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.shoppingDayReminder}
                        onChange={(e) => saveSettings({ 
                          ...settings, 
                          shoppingDayReminder: e.target.checked 
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-dark-gray dark:text-light-gray">
                        🛒 Lembrete de dia de compras
                      </span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.lowStockReminder}
                        onChange={(e) => saveSettings({ 
                          ...settings, 
                          lowStockReminder: e.target.checked 
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-dark-gray dark:text-light-gray">
                        ⚠️ Alerta de baixo estoque
                      </span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.priceAlertReminder}
                        onChange={(e) => saveSettings({ 
                          ...settings, 
                          priceAlertReminder: e.target.checked 
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-dark-gray dark:text-light-gray">
                        💰 Alertas de preço
                      </span>
                    </label>
                  </div>

                  {/* Estatísticas */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-dark-gray dark:text-light-gray mb-2">
                      📊 Status Atual
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>📝 Itens pendentes: {items.filter(item => !item.comprado).length}</div>
                      <div>⚠️ Itens com baixo estoque: {getLowStockItems().length}</div>
                      <div>📅 Próximo lembrete: {settings.reminderDays.map(d => dayNames[d]).join(', ')} às {settings.reminderTime}</div>
                    </div>
                  </div>

                  {/* Botões de Teste */}
                  <div className="flex space-x-2">
                    <button
                      onClick={testNotifications}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors"
                    >
                      🧪 Testar Notificações
                    </button>
                    <button
                      onClick={() => scheduleReminder('Lembrete Agendado', 'Este é um lembrete de teste agendado!', 5000)}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg transition-colors"
                    >
                      ⏰ Agendar Teste
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
