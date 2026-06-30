import { Spinner } from '@/components/ui/Spinner';

/** Full-viewport loading state used while auth resolves. */
export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center text-flame-600 dark:text-flame-500">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
