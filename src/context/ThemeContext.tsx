import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'gradient-cosmos' | 'gradient-aurora' | 'gradient-sunset' | 'gradient-emerald' | 'gradient-rainbow' | 'gradient-ocean' | 'gradient-forest' | 'gradient-fire' | 'gradient-mystic' | 'gradient-sakura' | 'gradient-desert' | 'gradient-arctic' | 'gradient-twilight' | 'gradient-rose-gold' | 'gradient-celestial';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: Theme = 'gradient-aurora';
const THEMES: readonly Theme[] = [
  'dark', 'light', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 'gradient-emerald', 'gradient-rainbow',
  'gradient-ocean', 'gradient-forest', 'gradient-fire', 'gradient-mystic', 'gradient-sakura', 'gradient-desert', 'gradient-arctic', 'gradient-twilight', 'gradient-rose-gold', 'gradient-celestial',
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
    
    // Remove all possible theme classes
    const themeClasses = [
      'dark', 'light-theme', 'gradient-cosmos', 'gradient-aurora', 'gradient-sunset', 
      'gradient-emerald', 'gradient-rainbow', 'gradient-ocean', 'gradient-forest', 
      'gradient-fire', 'gradient-mystic', 'gradient-sakura', 'gradient-desert', 
      'gradient-arctic', 'gradient-twilight', 'gradient-rose-gold', 'gradient-celestial'
    ];
    root.classList.remove(...themeClasses);
    
    // Add the correct theme class
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      // For all gradient themes, the class name matches the theme ID
      root.classList.add(theme);
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
