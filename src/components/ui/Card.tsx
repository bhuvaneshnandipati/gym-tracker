import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** A rounded, elevated surface used to group content. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-iron-200 bg-white p-5 shadow-card',
        'dark:border-iron-800 dark:bg-iron-900 dark:shadow-card-dark',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-base font-semibold tracking-tight text-iron-900 dark:text-iron-50',
        className,
      )}
      {...props}
    />
  );
}
