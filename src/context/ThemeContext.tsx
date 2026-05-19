import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';

type Theme = 'dark' | 'cyberpunk' | 'linear' | 'anime' | 'cosmos' | 'classical' | 'minimal';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isCyberpunk: boolean;
  isAnime: boolean;
  isCosmos: boolean;
  isLinear: boolean;
  isClassical: boolean;
  isMinimal: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    const validThemes: Theme[] = ['dark', 'cyberpunk', 'linear', 'anime', 'cosmos', 'classical', 'minimal'];
    if (saved && validThemes.includes(saved as Theme)) {
      return saved as Theme;
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const themeFlags = useMemo(() => ({
    isDark: theme === 'dark' || theme === 'cyberpunk' || theme === 'linear' || theme === 'anime' || theme === 'cosmos',
    isCyberpunk: theme === 'cyberpunk',
    isAnime: theme === 'anime',
    isCosmos: theme === 'cosmos',
    isLinear: theme === 'linear',
    isClassical: theme === 'classical',
    isMinimal: theme === 'minimal',
  }), [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    ...themeFlags,
  }), [theme, themeFlags]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}