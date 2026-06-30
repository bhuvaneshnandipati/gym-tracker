import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Optional element rendered inside the field on the right (e.g. a toggle). */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, trailing, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-iron-700 dark:text-iron-300"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-iron-900 transition-colors',
            'placeholder:text-iron-400 dark:bg-iron-900 dark:text-iron-100 dark:placeholder:text-iron-500',
            trailing && 'pr-11',
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-iron-300 focus:border-flame-500 dark:border-iron-700',
            'focus:outline-none focus:ring-2 focus:ring-flame-500/40',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
});
