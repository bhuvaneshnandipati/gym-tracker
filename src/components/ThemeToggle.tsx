import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Segmented control for choosing the color theme. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex items-center gap-1 rounded-xl border border-iron-200 bg-iron-100 p-1 dark:border-iron-800 dark:bg-iron-900"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-white text-flame-600 shadow-sm dark:bg-iron-700 dark:text-flame-400'
                : 'text-iron-500 hover:text-iron-800 dark:text-iron-400 dark:hover:text-iron-100',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
