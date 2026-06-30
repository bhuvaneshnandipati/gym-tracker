/**
 * Runs once, synchronously, before React renders to avoid a flash of the wrong
 * theme. Mirrors the resolution logic in ThemeContext.
 */
export function initTheme(): void {
  try {
    const stored = window.localStorage.getItem('gym-tracker:theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored === 'dark' || ((stored === 'system' || stored === null) && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  } catch {
    // Ignore storage access errors (e.g. privacy mode); default to light.
  }
}
