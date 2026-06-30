import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'info' | 'success' | 'error';

const TONES: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: {
    wrap: 'bg-iron-100 text-iron-700 dark:bg-iron-800 dark:text-iron-200',
    icon: Info,
  },
  success: {
    wrap: 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300',
    icon: CheckCircle2,
  },
  error: {
    wrap: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300',
    icon: AlertCircle,
  },
};

/** Inline status message used in auth forms and elsewhere. */
export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { wrap, icon: Icon } = TONES[tone];
  return (
    <div
      className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm', wrap)}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
