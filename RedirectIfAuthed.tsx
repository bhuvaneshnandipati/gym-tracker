import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/** A centered prompt shown when a section has no data yet. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed',
        'border-iron-300 px-6 py-16 text-center dark:border-iron-700',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-flame-50 text-flame-600 dark:bg-flame-950/40 dark:text-flame-400">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-iron-900 dark:text-iron-50">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-iron-500 dark:text-iron-400">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
