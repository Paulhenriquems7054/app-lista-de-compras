import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onGoLogin: () => void;
}

export const SignUpForm: React.FC<Props> = ({ onGoLogin }) => {
  const { signUp } = useAuth();
  const [nomeCasal, setNomeCasal] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [success, setSuccess]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await signUp({ email, password, nomeCasal });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-dark-gray dark:text-white mb-2">Cadastro realizado!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Verifique seu e-mail para confirmar a conta (se aplicável), então entre com suas credenciais.
        </p>
        <button
          onClick={onGoLogin}
          className="w-full py-3 bg-mint-dark text-white font-semibold rounded-xl hover:bg-mint transition-colors"
        >
          Ir para o Login
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-dark-gray dark:text-white mb-6">Criar Conta</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do casal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Casal
          </label>
          <input
            type="text"
            autoComplete="organization"
            value={nomeCasal}
            onChange={e => setNomeCasal(e.target.value)}
            placeholder="Ex: João & Maria"
            required
            maxLength={60}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-dark-gray dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-mint-dark focus:border-transparent transition"
          />
        </div>

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
            Senha <span className="text-gray-400 font-normal">(mín. 6 caracteres)</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-dark-gray dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-mint-dark focus:border-transparent transition pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Confirmar senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirmar Senha
          </label>
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-dark-gray dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-mint-dark focus:border-transparent transition ${
              confirm && confirm !== password
                ? 'border-red-400 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {confirm && confirm !== password && (
            <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
          )}
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
          disabled={loading || (!!confirm && confirm !== password)}
          className="w-full py-3 bg-mint-dark hover:bg-mint disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Criando conta...
            </span>
          ) : 'Criar Conta'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
        Já tem conta?{' '}
        <button
          onClick={onGoLogin}
          className="text-mint-dark hover:underline font-semibold dark:text-mint"
        >
          Entrar
        </button>
      </p>
    </>
  );
};
