import { StateCreator } from 'zustand';
import { Theme } from '@/types';

export interface ThemeSlice {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',

  setTheme: (theme: Theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let resolved: 'light' | 'dark';
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    root.classList.add(resolved);
    set({ resolvedTheme: resolved });
  },

  initTheme: () => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const theme = stored || 'system';
    get().setTheme(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (get().theme === 'system') {
        const resolved = e.matches ? 'dark' : 'light';
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
        set({ resolvedTheme: resolved });
      }
    });
  },
});
