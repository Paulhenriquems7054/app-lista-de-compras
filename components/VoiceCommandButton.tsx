import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceRecognitionService, VoiceRecognitionState } from '../services/voiceRecognition';
import { parseVoiceCommand } from '../services/voiceCommandParser';
import { executeVoiceCommand, ExecutorContext, ExecutorResult } from '../services/voiceCommandExecutor';

interface VoiceCommandButtonProps {
  context: ExecutorContext;
}

interface Toast {
  id: number;
  text: string;
  success: boolean;
}

// ── Detecção lazy (após mount) para garantir que a API já está disponível ──────
function detectSpeechSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ context }) => {
  // Começa como true para SEMPRE mostrar o botão.
  // Só passa para false se após montar confirmarmos que não tem suporte.
  const [supported, setSupported]     = useState(true);
  const [voiceState, setVoiceState]   = useState<VoiceRecognitionState>('idle');
  const [transcript, setTranscript]   = useState('');
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const [showHelp, setShowHelp]       = useState(false);
  const serviceRef  = useRef<VoiceRecognitionService | null>(null);
  const contextRef  = useRef(context);
  const toastId     = useRef(0);

  // Detectar suporte após mount (não síncrono no estado inicial)
  useEffect(() => {
    setSupported(detectSpeechSupport());
  }, []);

  // Manter contextRef atualizado sem recriar o serviço
  useEffect(() => { contextRef.current = context; }, [context]);

  // Limpar serviço ao desmontar
  useEffect(() => () => { serviceRef.current?.destroy(); }, []);

  // ── Toast ───────────────────────────────────────────────────────────────
  const addToast = useCallback((text: string, success: boolean) => {
    if (!text) return;
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, text, success }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Criar / recriar serviço com contexto atual ──────────────────────────
  const buildService = useCallback(() => {
    serviceRef.current?.destroy();
    serviceRef.current = new VoiceRecognitionService({
      onResult: (text) => {
        setTranscript(text);
        const cmd    = parseVoiceCommand(text);
        const result: ExecutorResult = executeVoiceCommand(cmd, contextRef.current);
        addToast(result.message, result.success);
        setTimeout(() => setVoiceState('idle'), 400);
      },
      onError: (msg) => {
        if (msg) addToast(msg, false);
        setVoiceState('idle');
      },
      onStateChange: (state) => {
        setVoiceState(state);
        if (state === 'idle') setTranscript('');
      },
    });
    return serviceRef.current;
  }, [addToast]);

  // ── Clique no botão ─────────────────────────────────────────────────────
  const handleToggle = () => {
    // Verificar suporte no momento do clique (mais confiável em mobile)
    if (!detectSpeechSupport()) {
      addToast('Seu navegador não possui suporte para comandos de voz.', false);
      setSupported(false);
      return;
    }

    if (voiceState === 'listening') {
      serviceRef.current?.stop();
      return;
    }

    if (voiceState === 'idle') {
      setTranscript('');
      const svc = buildService();
      svc.start();
    }
  };

  const isListening  = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';
  const isActive     = isListening || isProcessing;

  return (
    <>
      {/* ── Toasts ────────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none w-full max-w-sm px-4"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white text-center w-full
              ${t.success ? 'bg-mint-dark' : 'bg-gray-800'}`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* ── Banner "Estou ouvindo" ──────────────────────────────────────── */}
      {isActive && (
        <div
          className="fixed left-0 right-0 flex justify-center z-40 pointer-events-none px-4"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="bg-white dark:bg-dark-card shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 border border-mint/30 max-w-sm w-full">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
              isListening
                ? 'bg-red-500 animate-pulse'
                : 'bg-mint-dark'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark-gray dark:text-white">
                {isListening ? '🎤 Estou ouvindo...' : '⚙️ Processando...'}
              </p>
              {transcript && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  "{transcript}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de ajuda ─────────────────────────────────────────────── */}
      {showHelp && (
        <div
          className="fixed right-4 z-50 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 w-72 text-sm"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-dark-gray dark:text-white">Comandos de Voz</p>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {!supported && (
            <p className="text-xs text-red-500 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              ⚠️ Seu navegador não suporta reconhecimento de voz. Use Chrome no Android ou Safari no iOS.
            </p>
          )}

          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            {[
              { cmd: 'criar sabão em barra',       desc: 'Cria no catálogo' },
              { cmd: 'adicionar arroz',             desc: 'Adiciona ao Modo Compras' },
              { cmd: 'adicionar 5 kg de açúcar',    desc: 'Com quantidade' },
              { cmd: 'remover leite',               desc: 'Remove um item' },
              { cmd: 'marcar pão como comprado',    desc: 'Marca como comprado' },
              { cmd: 'criar categoria pet',         desc: 'Nova categoria' },
              { cmd: 'excluir categoria pet',       desc: 'Remove categoria' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex gap-2 items-start">
                <code className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-xs text-mint-dark font-mono flex-shrink-0 mt-0.5">
                  {cmd}
                </code>
                <span className="text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Botão flutuante ─────────────────────────────────────────────── */}
      <div
        className="fixed right-4 z-40 flex flex-col items-end gap-2"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Botão ? — ajuda */}
        {!isActive && (
          <button
            onClick={() => setShowHelp(v => !v)}
            className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
            aria-label="Ajuda com comandos de voz"
          >
            ?
          </button>
        )}

        {/* Botão principal */}
        <button
          onClick={handleToggle}
          disabled={isProcessing}
          aria-label={isListening ? 'Parar reconhecimento de voz' : 'Iniciar reconhecimento de voz'}
          className={`
            relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center
            transition-all duration-200 active:scale-95
            ${isListening
              ? 'bg-red-500 scale-110'
              : isProcessing
              ? 'bg-mint opacity-70'
              : supported
              ? 'bg-mint-dark hover:scale-105'
              : 'bg-gray-400'
            }
          `}
          style={{
            // Garante área de toque mínima de 56px no mobile
            minWidth: '56px',
            minHeight: '56px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Ondas pulsantes quando ouvindo */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
              <span className="absolute -inset-2 rounded-full bg-red-300 animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
            </>
          )}

          {/* Ícones de estado */}
          {isProcessing ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isListening ? (
            /* Quadrado = parar */
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            /* Microfone */
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8"  y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};
