import React from 'react';
import { Category } from './types';

// Fix: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
export const CATEGORIES: { name: Category; icon: React.ReactElement; color: string }[] = [
  { name: Category.FRUTAS_E_VERDURAS, icon: <span role="img" aria-label="Frutas">🍎</span>, color: 'bg-red-400' },
  { name: Category.CARNES_E_FRIOS, icon: <span role="img" aria-label="Carnes">🥩</span>, color: 'bg-red-600' },
  { name: Category.LATICINIOS, icon: <span role="img" aria-label="Laticínios">🧀</span>, color: 'bg-yellow-400' },
  { name: Category.PADARIA, icon: <span role="img" aria-label="Padaria">🥖</span>, color: 'bg-yellow-600' },
  { name: Category.MERCEARIA, icon: <span role="img" aria-label="Mercearia">🥫</span>, color: 'bg-blue-400' },
  { name: Category.LIMPEZA, icon: <span role="img" aria-label="Limpeza">🧹</span>, color: 'bg-green-400' },
  { name: Category.HIGIENE_PESSOAL, icon: <span role="img" aria-label="Higiene">🪥</span>, color: 'bg-purple-400' },
  { name: Category.BEBIDAS, icon: <span role="img" aria-label="Bebidas">🧃</span>, color: 'bg-orange-400' },
  { name: Category.OUTROS, icon: <span role="img" aria-label="Outros">🧺</span>, color: 'bg-gray-400' },
];

export const CATEGORY_NAMES = Object.values(Category);