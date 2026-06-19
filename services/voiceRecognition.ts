// ─────────────────────────────────────────────────────────────────────────────
// voiceRecognition.ts
// Abstração sobre a Web Speech API (SpeechRecognition / webkitSpeechRecognition)
// Sem IA, sem APIs pagas — usa apenas o motor nativo do navegador.
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceRecognitionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'unsupported';

export interface VoiceRecognitionCallbacks {
  onResult: (transcript: string) => void;
  onError: (message: string) => void;
  onStateChange: (state: VoiceRecognitionState) => void;
}

// Detecta a API disponível no navegador
function getSpeechRecognitionAPI(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ??
    null
  );
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionAPI() !== null;
}

export class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private callbacks: VoiceRecognitionCallbacks;
  private _state: VoiceRecognitionState = 'idle';

  constructor(callbacks: VoiceRecognitionCallbacks) {
    this.callbacks = callbacks;

    const API = getSpeechRecognitionAPI();
    if (!API) {
      this._state = 'unsupported';
      return;
    }

    this.recognition = new API();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.setState('listening');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.setState('processing');
      const transcript = event.results[0][0].transcript.trim();
      this.callbacks.onResult(transcript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = this.translateError(event.error);
      this.setState('idle');
      this.callbacks.onError(msg);
    };

    this.recognition.onend = () => {
      // Só volta para idle se não foi para processing (onresult chama setState('processing') antes)
      if (this._state === 'listening') {
        this.setState('idle');
      }
    };
  }

  get state(): VoiceRecognitionState {
    return this._state;
  }

  start(): void {
    if (!this.recognition) {
      this.callbacks.onError('Seu navegador não possui suporte para comandos de voz.');
      return;
    }
    if (this._state === 'listening') return;
    try {
      this.recognition.start();
    } catch {
      this.callbacks.onError('Não foi possível iniciar o reconhecimento de voz.');
    }
  }

  stop(): void {
    if (this.recognition && this._state === 'listening') {
      this.recognition.stop();
    }
  }

  destroy(): void {
    if (this.recognition) {
      this.recognition.onstart  = null;
      this.recognition.onresult = null;
      this.recognition.onerror  = null;
      this.recognition.onend    = null;
      try { this.recognition.abort(); } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  private setState(state: VoiceRecognitionState): void {
    this._state = state;
    this.callbacks.onStateChange(state);
  }

  private translateError(error: string): string {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return '🔒 Permissão de microfone negada. Permita o acesso nas configurações do navegador.';
      case 'no-speech':
        return '🤫 Nenhuma fala detectada. Tente novamente.';
      case 'network':
        return '🌐 Erro de conexão. Verifique sua internet.';
      case 'aborted':
        return '';  // Cancelamento pelo usuário — sem mensagem
      case 'audio-capture':
        return '🎙️ Microfone não encontrado ou indisponível.';
      case 'bad-grammar':
        return '❌ Erro de configuração do reconhecimento.';
      default:
        return 'Não foi possível reconhecer a fala. Tente novamente.';
    }
  }
}
