import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';

/**
 * "Remember me" is implemented by routing Supabase's session storage to either
 * localStorage (persists across browser restarts) or sessionStorage (cleared
 * when the tab closes). The choice is recorded before sign-in via setRemember().
 */
const REMEMBER_KEY = 'gym-tracker:remember';

export function setRemember(remember: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
  } catch {
    // Ignore storage errors (e.g. privacy mode).
  }
}

function shouldRemember(): boolean {
  try {
    // Default to remembering the user unless they opted out.
    return window.localStorage.getItem(REMEMBER_KEY) !== 'false';
  } catch {
    return true;
  }
}

function activeStore(): Storage {
  return shouldRemember() ? window.localStorage : window.sessionStorage;
}

/** Storage adapter that follows the current "remember me" choice. */
const rememberAwareStorage = {
  getItem: (key: string): string | null => {
    try {
      return activeStore().getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      activeStore().setItem(key, value);
    } catch {
      // Ignore.
    }
  },
  removeItem: (key: string): void => {
    // Clear from both stores so a switch never leaves stale tokens behind.
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};

const AUTH_STORAGE_KEY = 'gym-tracker:auth';

/**
 * The session saved on this device, read without any network call.
 *
 * Used when the app opens offline with an expired access token: Supabase can't
 * refresh it without a connection and reports no session, but the user is
 * still signed in on this device and their offline data is keyed by user id.
 * The token is refreshed the next time "Sync to cloud" runs online.
 */
export function readStoredSession(): Session | null {
  const raw = rememberAwareStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    return parsed && parsed.user?.id && parsed.refresh_token ? (parsed as Session) : null;
  } catch {
    return null;
  }
}

/** Remove the saved session without a network call (offline sign-out). */
export function clearStoredSession(): void {
  rememberAwareStorage.removeItem(AUTH_STORAGE_KEY);
  rememberAwareStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
  rememberAwareStorage.removeItem(`${AUTH_STORAGE_KEY}-user`);
}

/**
 * The Supabase client is created only when credentials are present. The app
 * shows a configuration screen otherwise (see main.tsx), so consumers can
 * safely assume a client exists once the app has rendered its routes.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: rememberAwareStorage,
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

/** Narrowing helper so callers get a non-null client or a clear error. */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
