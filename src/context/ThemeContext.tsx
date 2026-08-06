import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'orange' | 'green' | 'purple' | 'blue' | 'red';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('ethio_cosmos_theme') as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ethio_cosmos_theme', theme);
    const root = document.documentElement;
    root.classList.remove('light-theme', 'orange-theme', 'green-theme', 'purple-theme', 'blue-theme', 'red-theme', 'dark');
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
