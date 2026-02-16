import { useEffect } from 'react';
import { useStore } from '@/store';
import { Theme } from '@/types';

export function useTheme() {
  const { theme, resolvedTheme, setTheme, initTheme } = useStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    isDark: resolvedTheme === 'dark',
  };
}
