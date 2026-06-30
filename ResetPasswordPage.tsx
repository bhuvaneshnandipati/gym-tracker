/**
 * Centralised, typed access to environment variables.
 *
 * Vite exposes only variables prefixed with `VITE_` to the client. Reading them
 * through this module keeps access consistent and makes missing configuration
 * easy to detect during local development.
 */

interface AppEnv {
  appName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function read(key: keyof ImportMetaEnv): string {
  return (import.meta.env[key] ?? '').trim();
}

export const env: AppEnv = {
  appName: read('VITE_APP_NAME') || 'Gym Tracker',
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
};

/**
 * Whether Supabase credentials are present. The backend is wired up in
 * Milestone 2; until then the app runs without it, so this is informational.
 */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
