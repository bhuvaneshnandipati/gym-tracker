import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-iron-700 dark:text-iron-300"
        >
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-3 text-sm text-iron-900 transition-colors',
          'dark:bg-iron-900 dark:text-iron-100',
          error ? 'border-red-500' : 'border-iron-300 dark:border-iron-700',
          'focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
});
