import { Logo } from '@/components/Logo';
import { Alert } from '@/components/ui/Alert';

/** Friendly guidance shown when Supabase credentials are not set. */
export function MissingSupabaseConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-iron-200 bg-white p-6 shadow-card dark:border-iron-800 dark:bg-iron-900 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-iron-900 dark:text-iron-50">
            Connect Supabase to continue
          </h1>
          <p className="mt-1 text-sm text-iron-500 dark:text-iron-400">
            The backend isn&apos;t configured yet. Add your Supabase credentials, then restart the
            dev server.
          </p>

          <div className="mt-6 space-y-4">
            <Alert tone="info">
              Create a free project at supabase.com, then copy its API URL and anon key from{' '}
              <strong>Project Settings → API</strong>.
            </Alert>

            <div className="rounded-xl bg-iron-950 p-4 font-mono text-xs leading-relaxed text-iron-200">
              <p className="text-iron-400"># .env</p>
              <p>VITE_SUPABASE_URL="https://your-project.supabase.co"</p>
              <p>VITE_SUPABASE_ANON_KEY="your-anon-key"</p>
            </div>

            <p className="text-sm text-iron-500 dark:text-iron-400">
              See the README for the full setup, including applying the database migration in{' '}
              <code className="rounded bg-iron-100 px-1 py-0.5 text-xs dark:bg-iron-800">
                supabase/migrations
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
