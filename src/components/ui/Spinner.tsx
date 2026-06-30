import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Simple spinning loader. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin', className)} aria-hidden="true" />;
}
