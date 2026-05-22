import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => {
    const body = document.body;
    body.style.transition = 'opacity 0.18s ease';
    body.style.opacity = '0';
    setTimeout(() => {
      setTheme(t => (t === 'dark' ? 'light' : 'dark'));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          body.style.opacity = '1';
          setTimeout(() => { body.style.transition = ''; }, 200);
        });
      });
    }, 180);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
