import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

/** Catch-all route for unknown paths. */
export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-8" />
      <p className="text-7xl font-bold tracking-tight text-flame-600 dark:text-flame-500">404</p>
      <h1 className="mt-2 text-xl font-semibold text-iron-900 dark:text-iron-50">
        This page took a rest day
      </h1>
      <p className="mt-1 max-w-sm text-sm text-iron-500 dark:text-iron-400">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-flame-600 px-4 text-sm font-medium text-white transition-colors hover:bg-flame-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
