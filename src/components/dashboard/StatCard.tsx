import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

export type StatTone = 'flame' | 'emerald' | 'sky' | 'amber' | 'violet' | 'iron';

const TONES: Record<StatTone, string> = {
  flame: 'bg-flame-50 text-flame-600 dark:bg-flame-950/40 dark:text-flame-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  iron: 'bg-iron-100 text-iron-600 dark:bg-iron-800 dark:text-iron-300',
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: StatTone;
  loading?: boolean;
}

/** A single dashboard metric tile. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'flame',
  loading,
}: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4 transition-shadow duration-200 hover:shadow-lg sm:p-5 dark:hover:shadow-card-dark">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-iron-500 dark:text-iron-400">
          {label}
        </span>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            TONES[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : (
        <div>
          <p className="truncate text-2xl font-bold tracking-tight tabular-nums text-iron-900 dark:text-iron-50">
            {value}
          </p>
          <p className="mt-0.5 truncate text-xs text-iron-400">{hint ?? '\u00A0'}</p>
        </div>
      )}
    </Card>
  );
}
