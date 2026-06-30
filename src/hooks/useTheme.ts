import { useContext } from 'react';
import { ThemeContext } from '@/contexts/theme-context';

export type { Theme, ResolvedTheme } from '@/contexts/theme-context';

/** Access the current theme and theme controls. Must be used inside ThemeProvider. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
