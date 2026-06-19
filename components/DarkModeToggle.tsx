import React, { useState, useEffect } from 'react';

export const DarkModeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    const applyDarkMode = (dark: boolean) => {
      const html = document.documentElement;
      const body = document.body;
      
      if (dark) {
        html.classList.add('dark');
        body.classList.add('dark');
        html.style.colorScheme = 'dark';
      } else {
        html.classList.remove('dark');
        body.classList.remove('dark');
        html.style.colorScheme = 'light';
      }
      
      localStorage.setItem('darkMode', dark.toString());
      console.log('🌓 Dark mode atualizado:', dark);
    };

    applyDarkMode(isDark);
  }, [isDark]);

  const toggle = () => {
    setIsDark(prev => !prev);
  };

  return (
    <button 
      onClick={toggle}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <span className="text-2xl">{isDark ? '☀️' : '🌙'}</span>
      <span className="font-medium">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
    </button>
  );
};
