import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Loading placeholder that uses the shimmer defined in the global stylesheet. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} aria-hidden="true" {...props} />;
}
