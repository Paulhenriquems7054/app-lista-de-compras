/**
 * CoupleLink
 *
 * Tela de vínculo entre casal.
 * Permite que um usuário convide o parceiro pelo e-mail,
 * visualize o status do vínculo atual e desvincule se necessário.
 *
 * Usa as funções RPC do Supabase:
 *   - link_couple(partner_email)
 *   - unlink_couple()
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { invalidateCoupleIdCache } from '../services/shoppingService';

interface CoupleLinkProps {
  userId: string;
  onClose: () => void;
}

interface CoupleStatus {
  coupled: boolean;
  coupleId: string | null;
  partnerEmail: string | null;
  partnerName: string | null;
}

export const CoupleLink: React.FC<CoupleLinkProps> = ({ userId, onClose }) => {
  const [status, setStatus] = useState<CoupleStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // ── Carregar status do vínculo ──────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Buscar perfil do usuário atual com couple_id
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('couple_id, email, nome_casal')
      .eq('id', userId)
      .single();

    if (!myProfile?.couple_id) {
      setStatus({ coupled: false, coupleId: null, partnerEmail: null, partnerName: null });
      setIsLoading(false);
      return;
    }

    // Buscar o parceiro (outro usuário com mesmo couple_id)
    const { data: partner } = await supabase
      .from('profiles')
      .select('email, nome_casal')
      .eq('couple_id', myProfile.couple_id)
      .neq('id', userId)
      .single();

    setStatus({
      coupled: true,
      coupleId: myProfile.couple_id,
      partnerEmail: partner?.email ?? null,
      partnerName: partner?.nome_casal ?? null,
    });
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Vincular casal ──────────────────────────────────────────────────────────
  const handleLink = async () => {
    if (!partnerEmail.trim()) return;
    if (!supabase) {
      setMessage({ type: 'error', text: 'Supabase não configurado. Não é possível vincular em modo offline.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('link_couple', {
      partner_email: partnerEmail.trim().toLowerCase(),
    });

    setIsSubmitting(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }

    const result = data as { success?: boolean; error?: string };
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    invalidateCoupleIdCache();
    setMessage({ type: 'success', text: '✅ Casal vinculado com sucesso! A lista agora é compartilhada em tempo real.' });
    setPartnerEmail('');
    await loadStatus();
  };

  // ── Desvincular casal ───────────────────────────────────────────────────────
  const handleUnlink = async () => {
    if (!supabase) return;
    setIsSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('unlink_couple');

    setIsSubmitting(false);
    setConfirmUnlink(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }

    const result = data as { success?: boolean; error?: string };
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    invalidateCoupleIdCache();
    setMessage({ type: 'success', text: 'Vínculo removido. Cada conta agora tem sua própria lista.' });
    await loadStatus();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💑</span>
            <div>
              <h2 className="text-lg font-bold text-dark-gray dark:text-white">Vínculo de Casal</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lista compartilhada em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-mint border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Sem Supabase */}
          {!isLoading && !supabase && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🔌</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vínculo de casal requer conexão com Supabase.<br />
                O app está em modo offline.
              </p>
            </div>
          )}

          {/* Status: JÁ VINCULADO */}
          {!isLoading && supabase && status?.coupled && (
            <div className="space-y-4">
              {/* Card do parceiro */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💚</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-800 dark:text-green-300 text-sm">
                      Casal vinculado
                    </p>
                    <p className="text-green-700 dark:text-green-400 font-bold truncate">
                      {status.partnerName || 'Parceiro(a)'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 truncate">
                      {status.partnerEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                  Lista sincronizada em tempo real entre os dois aparelhos
                </div>
              </div>

              {/* Desvincular */}
              {!confirmUnlink ? (
                <button
                  onClick={() => setConfirmUnlink(true)}
                  className="w-full py-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-xl transition-colors font-medium"
                >
                  🔓 Desvincular casal
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Tem certeza? As listas voltarão a ser independentes.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnlink}
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {isSubmitting ? 'Desvinculando...' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => setConfirmUnlink(false)}
                      className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status: NÃO VINCULADO */}
          {!isLoading && supabase && !status?.coupled && (
            <div className="space-y-4">
              {/* Explicação */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Como funciona?
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
                  <li>👤 Cada pessoa cria sua própria conta</li>
                  <li>🔗 Um dos dois convida o outro pelo e-mail</li>
                  <li>⚡ A lista passa a ser compartilhada em tempo real</li>
                  <li>📱 Funciona em qualquer aparelho, simultaneamente</li>
                </ul>
              </div>

              {/* Formulário de convite */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-dark-gray dark:text-light-gray">
                  E-mail do(a) parceiro(a)
                </label>
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={e => { setPartnerEmail(e.target.value); setMessage(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleLink()}
                  placeholder="parceiro@email.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-dark dark:bg-gray-700 dark:text-white text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  O(a) parceiro(a) precisa já ter uma conta criada no app.
                </p>
                <button
                  onClick={handleLink}
                  disabled={!partnerEmail.trim() || isSubmitting}
                  className="w-full py-3 bg-mint hover:bg-mint-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Vinculando...
                    </span>
                  ) : (
                    '💑 Vincular casal'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de feedback */}
          {message && (
            <div className={`rounded-xl p-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {message.text}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
