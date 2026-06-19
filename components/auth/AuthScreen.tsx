import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthView = 'login' | 'signup' | 'forgot';

export const AuthScreen: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint/20 via-white to-mint-dark/10 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-mint-dark rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-2xl font-bold text-dark-gray dark:text-white">Lista de Compras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize as compras do seu casal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-8">
          {view === 'login'  && <LoginForm  onGoSignUp={() => setView('signup')} onGoForgot={() => setView('forgot')} />}
          {view === 'signup' && <SignUpForm  onGoLogin={() => setView('login')} />}
          {view === 'forgot' && <ForgotPasswordForm onGoLogin={() => setView('login')} />}
        </div>
      </div>
    </div>
  );
};
