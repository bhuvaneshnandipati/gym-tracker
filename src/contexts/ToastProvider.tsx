import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
  type ToastTone,
} from '@/contexts/toast-context';
import { cn } from '@/utils/cn';

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONES: Record<ToastTone, string> = {
  success:
    'border-green-200 bg-white text-green-800 dark:border-green-900 dark:bg-iron-900 dark:text-green-300',
  error:
    'border-red-200 bg-white text-red-800 dark:border-red-900 dark:bg-iron-900 dark:text-red-300',
  info: 'border-iron-200 bg-white text-iron-800 dark:border-iron-800 dark:bg-iron-900 dark:text-iron-200',
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      counter += 1;
      const id = `toast-${counter}`;
      setToasts((prev) => [...prev, { id, tone, message }]);
      const timer = window.setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
      dismiss,
    }),
    [toasts, show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-card animate-fade-in dark:shadow-card-dark',
                TONES[t.tone],
              )}
              role="status"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-iron-400 hover:text-iron-700 dark:hover:text-iron-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
