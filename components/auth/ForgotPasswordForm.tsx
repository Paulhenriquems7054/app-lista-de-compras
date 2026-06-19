import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onGoLogin: () => void;
}

export const ForgotPasswordForm: React.FC<Props> = ({ onGoLogin }) => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await sendPasswordReset(email);
    setLoading(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-dark-gray dark:text-white mb-2">E-mail enviado!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
        </p>
        <button
          onClick={onGoLogin}
          className="w-full py-3 bg-mint-dark text-white font-semibold rounded-xl hover:bg-mint transition-colors"
        >
          Voltar ao Login
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={onGoLogin}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-mint-dark dark:hover:text-mint mb-6 transition-colors"
      >
        ← Voltar ao login
      </button>

      <h2 className="text-xl font-bold text-dark-gray dark:text-white mb-2">Recuperar Senha</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-mint-dark hover:bg-mint disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </span>
          ) : 'Enviar Link de Recuperação'}
        </button>
      </form>
    </>
  );
};
