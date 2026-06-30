import { createContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The user's selected preference. */
  theme: Theme;
  /** The theme actually applied after resolving "system". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (resolves "system" first). */
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'gym-tracker:theme';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
