import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Session, AuthState } from '../types';

// ─── Tipos do contexto ────────────────────────────────────────────────────────

interface SignUpParams {
  email: string;
  password: string;
  nomeCasal: string;
}

interface SignInParams {
  email: string;
  password: string;
}

interface AuthContextValue {
  authState: AuthState;
  user: User | null;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  signIn: (params: SignInParams) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SESSION_KEY = 'lc_user_session';

function saveLocalSession(user: User, accessToken: string, expiresAt: number) {
  try {
    const session: Session = { user, accessToken, expiresAt };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage pode estar cheio — ignorar
  }
}

function loadLocalSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    // Verificar expiração (margem de 60s)
    if (session.expiresAt && Date.now() > session.expiresAt - 60_000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}

function supabaseUserToUser(
  sbUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    nomeCasal:
      (sbUser.user_metadata?.nome_casal as string) ||
      (sbUser.user_metadata?.full_name as string) ||
      (sbUser.email?.split('@')[0] ?? 'Usuário'),
    createdAt: new Date().toISOString(),
  };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Senha deve ter pelo menos 6 caracteres.';
  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const initialized = useRef(false);

  // ── Inicialização: restaurar sessão ────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      if (supabase) {
        // Registrar listener PRIMEIRO — antes de qualquer getSession
        // Garante que mudanças de sessão são capturadas sempre
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
          if (sbSession?.user) {
            const user = supabaseUserToUser(sbSession.user);
            const session: Session = {
              user,
              accessToken: sbSession.access_token,
              expiresAt: (sbSession.expires_at ?? 0) * 1000,
            };
            saveLocalSession(user, session.accessToken, session.expiresAt);
            setAuthState({ status: 'authenticated', user, session });
          } else {
            clearLocalSession();
            setAuthState({ status: 'unauthenticated' });
          }
        });

        // Verificar sessão existente
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const user = supabaseUserToUser(data.session.user);
          const session: Session = {
            user,
            accessToken: data.session.access_token,
            expiresAt: (data.session.expires_at ?? 0) * 1000,
          };
          saveLocalSession(user, session.accessToken, session.expiresAt);
          setAuthState({ status: 'authenticated', user, session });
        } else {
          // Sem sessão Supabase — tentar cache local
          const local = loadLocalSession();
          if (local) {
            setAuthState({ status: 'authenticated', user: local.user, session: local });
          } else {
            setAuthState({ status: 'unauthenticated' });
          }
        }

        // Cleanup do listener é feito pelo React quando o componente desmonta
        return () => subscription.unsubscribe();
      } else {
        // Modo offline — usar sessão local
        const local = loadLocalSession();
        if (local) {
          setAuthState({ status: 'authenticated', user: local.user, session: local });
        } else {
          setAuthState({ status: 'unauthenticated' });
        }
      }
    };

    init();
  }, []);

  // ── signUp ─────────────────────────────────────────────────────────────────
  const signUp = useCallback(async ({ email, password, nomeCasal }: SignUpParams) => {
    // Validações client-side
    if (!validateEmail(email)) return { error: 'E-mail inválido.' };
    const pwErr = validatePassword(password);
    if (pwErr) return { error: pwErr };
    if (!nomeCasal.trim()) return { error: 'Nome do casal é obrigatório.' };

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { nome_casal: nomeCasal.trim() } },
      });
      if (error) return { error: translateAuthError(error.message) };
      if (data.user) {
        const user = supabaseUserToUser(data.user);
        const expiresAt = Date.now() + 3600_000;
        const session: Session = {
          user,
          accessToken: data.session?.access_token ?? '',
          expiresAt,
        };
        saveLocalSession(user, session.accessToken, expiresAt);
        setAuthState({ status: 'authenticated', user, session });
      }
      return { error: null };
    }

    // Modo offline: criar usuário local
    const existingUsers: User[] = JSON.parse(localStorage.getItem('lc_users') ?? '[]');
    if (existingUsers.some(u => u.email === email.trim().toLowerCase())) {
      return { error: 'Este e-mail já está cadastrado.' };
    }

    const newUser: User = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: email.trim().toLowerCase(),
      nomeCasal: nomeCasal.trim(),
      createdAt: new Date().toISOString(),
    };

    // Armazenar usuário + hash simplificado (modo offline sem bcrypt)
    const usersEntry = [...existingUsers, newUser];
    localStorage.setItem('lc_users', JSON.stringify(usersEntry));
    // Armazenar senha hash (base64 simples para modo offline — não usar em produção)
    localStorage.setItem(`lc_pw_${newUser.id}`, btoa(password));

    const expiresAt = Date.now() + 30 * 24 * 3600_000;
    const session: Session = { user: newUser, accessToken: newUser.id, expiresAt };
    saveLocalSession(newUser, newUser.id, expiresAt);
    setAuthState({ status: 'authenticated', user: newUser, session });
    return { error: null };
  }, []);

  // ── signIn ─────────────────────────────────────────────────────────────────
  const signIn = useCallback(async ({ email, password }: SignInParams) => {
    if (!validateEmail(email)) return { error: 'E-mail inválido.' };
    if (!password) return { error: 'Senha é obrigatória.' };

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { error: translateAuthError(error.message) };
      if (data.user) {
        const user = supabaseUserToUser(data.user);
        const expiresAt = (data.session?.expires_at ?? 0) * 1000;
        const session: Session = {
          user,
          accessToken: data.session?.access_token ?? '',
          expiresAt,
        };
        saveLocalSession(user, session.accessToken, expiresAt);
        setAuthState({ status: 'authenticated', user, session });
      }
      return { error: null };
    }

    // Modo offline
    const users: User[] = JSON.parse(localStorage.getItem('lc_users') ?? '[]');
    const found = users.find(u => u.email === email.trim().toLowerCase());
    if (!found) return { error: 'E-mail não encontrado.' };
    const stored = localStorage.getItem(`lc_pw_${found.id}`);
    if (stored !== btoa(password)) return { error: 'Senha incorreta.' };

    const expiresAt = Date.now() + 30 * 24 * 3600_000;
    const session: Session = { user: found, accessToken: found.id, expiresAt };
    saveLocalSession(found, found.id, expiresAt);
    setAuthState({ status: 'authenticated', user: found, session });
    return { error: null };
  }, []);

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    clearLocalSession();
    setAuthState({ status: 'unauthenticated' });
  }, []);

  // ── sendPasswordReset ──────────────────────────────────────────────────────
  const sendPasswordReset = useCallback(async (email: string) => {
    if (!validateEmail(email)) return { error: 'E-mail inválido.' };
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'https://app-lista-de-compras-two.vercel.app/' },
      );
      if (error) return { error: translateAuthError(error.message) };
      return { error: null };
    }
    // Modo offline: apenas confirmar (não há e-mail real)
    return { error: null };
  }, []);

  const user = authState.status === 'authenticated' ? authState.user : null;

  return (
    <AuthContext.Provider value={{ authState, user, signUp, signIn, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function useSession(): { user: User | null; isLoading: boolean; isAuthenticated: boolean } {
  const { authState, user } = useAuth();
  return {
    user,
    isLoading: authState.status === 'loading',
    isAuthenticated: authState.status === 'authenticated',
  };
}

// ─── Tradução de erros do Supabase ────────────────────────────────────────────

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))        return 'Confirme seu e-mail antes de fazer login.';
  if (msg.includes('User already registered'))    return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be at least')) return 'Senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Unable to validate email'))   return 'E-mail inválido.';
  if (msg.includes('Email rate limit exceeded'))  return 'Muitas tentativas. Aguarde alguns minutos.';
  if (msg.includes('network'))                    return 'Erro de conexão. Verifique sua internet.';
  return msg;
}
