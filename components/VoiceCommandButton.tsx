import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  VoiceRecognitionService,
  VoiceRecognitionState,
  isSpeechRecognitionSupported,
} from '../services/voiceRecognition';
import { parseVoiceCommand, describeCommand } from '../services/voiceCommandParser';
import { executeVoiceCommand, ExecutorContext, ExecutorResult } from '../services/voiceCommandExecutor';

interface VoiceCommandButtonProps {
  context: ExecutorContext;
}

interface Toast {
  id: number;
  text: string;
  success: boolean;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ context }) => {
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>(
    isSpeechRecognitionSupported() ? 'idle' : 'unsupported',
  );
  const [transcript, setTranscript]   = useState('');
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const [showHelp, setShowHelp]       = useState(false);
  const serviceRef = useRef<VoiceRecognitionService | null>(null);
  const toastCounter = useRef(0);

  // ── Inicializar serviço ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;

    serviceRef.current = new VoiceRecognitionService({
      onResult: (text) => {
        setTranscript(text);
        const cmd = parseVoiceCommand(text);
        const result: ExecutorResult = executeVoiceCommand(cmd, context);
        addToast(result.message, result.success);
        // Volta para idle após processar
        setTimeout(() => setVoiceState('idle'), 300);
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

    return () => {
      serviceRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O contexto muda a cada render pois são funções inline no App — recriar seria
  // custoso, então atualizamos via ref dentro do service em vez disso.
  // A solução é passar contexto via closure atualizada no onResult:
  const contextRef = useRef(context);
  useEffect(() => { contextRef.current = context; }, [context]);

  // ── Toast helpers ───────────────────────────────────────────────────────
  const addToast = useCallback((text: string, success: boolean) => {
    if (!text) return;
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, text, success }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // ── Toggle microfone ────────────────────────────────────────────────────
  const handleToggle = () => {
    if (!serviceRef.current) return;
    if (voiceState === 'listening') {
      serviceRef.current.stop();
    } else if (voiceState === 'idle') {
      setTranscript('');
      // Recria o service com o contexto mais recente
      serviceRef.current.destroy();
      serviceRef.current = new VoiceRecognitionService({
        onResult: (text) => {
          setTranscript(text);
          const cmd = parseVoiceCommand(text);
          const result = executeVoiceCommand(cmd, contextRef.current);
          addToast(result.message, result.success);
          setTimeout(() => setVoiceState('idle'), 300);
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
      serviceRef.current.start();
    }
  };

  // ── Não renderizar se não suportado ────────────────────────────────────
  if (voiceState === 'unsupported') {
    return null; // silêncioso — não polui a UI
  }

  const isListening   = voiceState === 'listening';
  const isProcessing  = voiceState === 'processing';
  const isActive      = isListening || isProcessing;

  return (
    <>
      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none w-full max-w-sm px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white text-center animate-fade-in
              ${t.success ? 'bg-mint-dark' : 'bg-gray-800'}`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* ── Banner "Estou ouvindo" ──────────────────────────────────────── */}
      {isActive && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 pointer-events-none px-4">
          <div className="bg-white dark:bg-dark-card shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 border border-mint/30 max-w-sm w-full">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-mint-dark animate-spin border-2 border-mint border-t-transparent'}`} />
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
        <div className="fixed bottom-20 right-4 z-50 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 w-72 text-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-dark-gray dark:text-white">Comandos de Voz</p>
            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
          </div>
          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            {[
              { cmd: 'adicionar arroz',             desc: 'Cria um item' },
              { cmd: 'remover leite',               desc: 'Remove um item' },
              { cmd: 'marcar pão como comprado',    desc: 'Marca como comprado' },
              { cmd: 'comprar café',                desc: 'Marca como comprado' },
              { cmd: 'criar categoria pet',         desc: 'Nova categoria' },
              { cmd: 'excluir categoria pet',       desc: 'Remove categoria' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex gap-2">
                <code className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-xs text-mint-dark font-mono flex-shrink-0">
                  {cmd}
                </code>
                <span className="text-xs self-center">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Botão flutuante ─────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        {/* Botão de ajuda (fica visível quando inativo) */}
        {!isActive && (
          <button
            onClick={() => setShowHelp(v => !v)}
            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
            aria-label="Ajuda com comandos de voz"
            title="Ver comandos disponíveis"
          >
            ?
          </button>
        )}

        {/* Botão principal do microfone */}
        <button
          onClick={handleToggle}
          disabled={isProcessing}
          aria-label={isListening ? 'Parar reconhecimento de voz' : 'Iniciar reconhecimento de voz'}
          title={isListening ? 'Parar' : 'Comando de voz'}
          className={`
            relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center
            transition-all duration-200 active:scale-95 disabled:cursor-wait
            ${isListening
              ? 'bg-red-500 shadow-red-300 dark:shadow-red-900 scale-110'
              : isProcessing
              ? 'bg-mint/80 shadow-mint/30'
              : 'bg-mint-dark shadow-mint-dark/30 hover:scale-105 hover:shadow-2xl'
            }
          `}
        >
          {/* Anel pulsante quando ouvindo */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 animation-delay-150" />
            </>
          )}

          {/* Ícone */}
          {isProcessing ? (
            <span className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : isListening ? (
            // Quadrado = parar
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Microfone
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};
