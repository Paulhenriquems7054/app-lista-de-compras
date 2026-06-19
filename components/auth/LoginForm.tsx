import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onGoSignUp: () => void;
  onGoForgot: () => void;
}

export const LoginForm: React.FC<Props> = ({ onGoSignUp, onGoForgot }) => {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn({ email, password });
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <>
      <h2 className="text-xl font-bold text-dark-gray dark:text-white mb-6">Entrar</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* E-mail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            E-mail
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="casal@email.com"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-dark-gray dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-mint-dark focus:border-transparent transition"
          />
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-dark-gray dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-mint-dark focus:border-transparent transition pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Botão */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-mint-dark hover:bg-mint disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Entrando...
            </span>
          ) : 'Entrar'}
        </button>
      </form>

      {/* Links */}
      <div className="mt-4 text-center space-y-2">
        <button
          onClick={onGoForgot}
          className="text-sm text-mint-dark hover:underline dark:text-mint"
        >
          Esqueci minha senha
        </button>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Não tem conta?{' '}
          <button
            onClick={onGoSignUp}
            className="text-mint-dark hover:underline font-semibold dark:text-mint"
          >
            Cadastrar
          </button>
        </p>
      </div>
    </>
  );
};
