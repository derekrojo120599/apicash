import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type ThemeId = 'emerald' | 'rose' | 'violet' | 'orange' | 'blue' | 'amber';

export interface ThemePalette {
  id: ThemeId;
  nombre: string;
  p50: string;
  p100: string;
  p200: string;
  p300: string;
  p400: string;
  p500: string;
  p600: string;
  p700: string;
  p800: string;
  p900: string;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  emerald: {
    id: 'emerald',
    nombre: 'Esmeralda',
    p50: '#ecfdf5',
    p100: '#d1fae5',
    p200: '#a7f3d0',
    p300: '#6ee7b7',
    p400: '#34d399',
    p500: '#10b981',
    p600: '#059669',
    p700: '#047857',
    p800: '#065f46',
    p900: '#064e3b',
  },
  rose: {
    id: 'rose',
    nombre: 'Rosa Cuarzo',
    p50: '#fff1f2',
    p100: '#ffe4e6',
    p200: '#fecdd3',
    p300: '#fda4af',
    p400: '#fb7185',
    p500: '#f43f5e',
    p600: '#e11d48',
    p700: '#be123c',
    p800: '#9f1239',
    p900: '#881337',
  },
  violet: {
    id: 'violet',
    nombre: 'Lavanda',
    p50: '#f5f3ff',
    p100: '#ede9fe',
    p200: '#ddd6fe',
    p300: '#c4b5fd',
    p400: '#a78bfa',
    p500: '#8b5cf6',
    p600: '#7c3aed',
    p700: '#6d28d9',
    p800: '#5b21b6',
    p900: '#4c1d95',
  },
  orange: {
    id: 'orange',
    nombre: 'Coral',
    p50: '#fff7ed',
    p100: '#ffedd5',
    p200: '#fed7aa',
    p300: '#fdba74',
    p400: '#fb923c',
    p500: '#f97316',
    p600: '#ea580c',
    p700: '#c2410c',
    p800: '#9a3412',
    p900: '#7c2d12',
  },
  blue: {
    id: 'blue',
    nombre: 'Azul Océano',
    p50: '#eff6ff',
    p100: '#dbeafe',
    p200: '#bfdbfe',
    p300: '#93c5fd',
    p400: '#60a5fa',
    p500: '#3b82f6',
    p600: '#2563eb',
    p700: '#1d4ed8',
    p800: '#1e40af',
    p900: '#1e3a8a',
  },
  amber: {
    id: 'amber',
    nombre: 'Dorado Ámbar',
    p50: '#fffbeb',
    p100: '#fef3c7',
    p200: '#fde68a',
    p300: '#fcd34d',
    p400: '#fbbf24',
    p500: '#f59e0b',
    p600: '#d97706',
    p700: '#b45309',
    p800: '#92400e',
    p900: '#78350f',
  },
};

export const THEME_LIST: ThemePalette[] = [
  THEMES.emerald,
  THEMES.rose,
  THEMES.violet,
  THEMES.orange,
  THEMES.blue,
  THEMES.amber,
];

interface ThemeContextValue {
  themeId: ThemeId;
  colors: ThemePalette;
  isDarkMode: boolean;
  setThemeId: (id: ThemeId) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'emerald',
  colors: THEMES.emerald,
  isDarkMode: true,
  setThemeId: async () => {},
  toggleDarkMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('emerald');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    // 1. Cargar desde AsyncStorage rápido
    AsyncStorage.getItem('apicash-theme').then((saved) => {
      if (saved && saved in THEMES) {
        setThemeIdState(saved as ThemeId);
      }
    });
    AsyncStorage.getItem('apicash-dark-mode').then((savedDark) => {
      if (savedDark !== null) {
        setIsDarkMode(savedDark === 'true');
      }
    });

    // 2. Sincronizar con perfil de Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('perfiles')
          .select('tema')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.tema && data.tema in THEMES) {
              setThemeIdState(data.tema as ThemeId);
              AsyncStorage.setItem('apicash-theme', data.tema);
            }
          });
      }
    });
  }, []);

  const setThemeId = async (newId: ThemeId) => {
    if (!(newId in THEMES)) return;
    setThemeIdState(newId);
    await AsyncStorage.setItem('apicash-theme', newId);
  };

  const toggleDarkMode = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    await AsyncStorage.setItem('apicash-dark-mode', String(next));
  };

  const colors = THEMES[themeId] || THEMES.emerald;

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        colors,
        isDarkMode,
        setThemeId,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
