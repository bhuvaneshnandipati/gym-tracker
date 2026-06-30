import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const areaId = id ?? generatedId;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={areaId}
          className="mb-1.5 block text-sm font-medium text-iron-700 dark:text-iron-300"
        >
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={areaId}
        className={cn(
          'w-full rounded-xl border border-iron-300 bg-white px-3.5 py-2.5 text-sm text-iron-900 transition-colors',
          'placeholder:text-iron-400 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-100 dark:placeholder:text-iron-500',
          'focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40',
          className,
        )}
        {...props}
      />
    </div>
  );
});
