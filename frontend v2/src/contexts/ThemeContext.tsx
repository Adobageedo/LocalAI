/**
 * Theme Context
 * Context pour gérer le thème de l'application
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider as FluentThemeProvider } from '@fluentui/react';
import { lightTheme, darkTheme } from '@/config/themes';
import { useLocalStorage } from '@/hooks/useStorage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useLocalStorage<ThemeMode>('theme', 'light');

  /**
   * Basculer entre light et dark
   */
  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  /**
   * Définir un thème spécifique
   */
  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  /**
   * Appliquer le thème au document
   */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.className = `theme-${mode}`;
  }, [mode]);

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setTheme }}>
      <FluentThemeProvider theme={theme}>
        {children}
      </FluentThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Hook pour utiliser le ThemeContext
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
