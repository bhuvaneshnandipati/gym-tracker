import { type ReactNode } from 'react';
import { Logo } from '@/components/Logo';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card layout shared by login, signup, and password pages. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-iron-200 bg-white p-6 shadow-card dark:border-iron-800 dark:bg-iron-900 dark:shadow-card-dark sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-iron-900 dark:text-iron-50">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-iron-500 dark:text-iron-400">{subtitle}</p>
          ) : null}

          <div className="mt-6">{children}</div>
        </div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-iron-500 dark:text-iron-400">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}
