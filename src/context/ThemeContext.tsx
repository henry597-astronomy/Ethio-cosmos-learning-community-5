import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'orange' | 'green' | 'purple' | 'blue' | 'red' | 'cyan' | 'gold' | 'rose' | 'indigo' | 'gradient-cosmos' | 'gradient-aurora' | 'gradient-sunset' | 'gradient-emerald' | 'gradient-rainbow';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: Theme = 'gradient-aurora';
const THEMES: readonly Theme[] = [
  'dark', 'light', 'orange', 'green', 'purple', 'blue', 'red', 'cyan', 'gold', 'rose',
  'indigo', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'gradient-rainbow',
];

const readSavedTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem('ethio_cosmos_theme');
    return savedTheme && THEMES.includes(savedTheme as Theme)
      ? (savedTheme as Theme)
      : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readSavedTheme);

  useEffect(() => {
    try {
      localStorage.setItem('ethio_cosmos_theme', theme);
    } catch {
      // Continue rendering when storage is unavailable in private/offline contexts.
    }
    const root = document.documentElement;
    root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'cyan-theme', 'gold-theme', 'rose-theme', 'indigo-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'gradient-rainbow', 'dark');
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else if (theme === 'orange') {
      root.classList.add('orange-theme');
    } else if (theme === 'green') {
      root.classList.add('green-theme');
    } else if (theme === 'purple') {
      root.classList.add('purple-theme');
    } else if (theme === 'blue') {
      root.classList.add('blue-theme');
    } else if (theme === 'red') {
      root.classList.add('red-theme');
    } else if (theme === 'cyan') {
      root.classList.add('cyan-theme');
    } else if (theme === 'gold') {
      root.classList.add('gold-theme');
    } else if (theme === 'rose') {
      root.classList.add('rose-theme');
    } else if (theme === 'indigo') {
      root.classList.add('indigo-theme');
    } else if (theme === 'gradient-cosmos') {
      root.classList.add('gradient-cosmos');
    } else if (theme === 'gradient-aurora') {
      root.classList.add('gradient-aurora');
    } else if (theme === 'gradient-sunset') {
      root.classList.add('gradient-sunset');
    } else if (theme === 'gradient-emerald') {
      root.classList.add('gradient-emerald');
    } else if (theme === 'gradient-rainbow') {
      root.classList.add('gradient-rainbow');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
