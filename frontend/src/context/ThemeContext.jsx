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
    // Create overlay that covers screen during switch
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;pointer-events:none;
      background:var(--bg);opacity:0;transition:opacity 0.15s ease;
    `;
    document.body.appendChild(overlay);
    // Fade in overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
    // Switch theme while covered, then fade out
    setTimeout(() => {
      setTheme(t => (t === 'dark' ? 'light' : 'dark'));
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 160);
      }, 50);
    }, 160);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
