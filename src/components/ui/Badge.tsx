import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Small pill label. Pass color classes via className. */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      {...props}
    />
  );
}
