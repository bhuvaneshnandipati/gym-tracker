import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { clearStoredSession, getSupabase, readStoredSession, setRemember } from '@/lib/supabase';
import type { Profile } from '@/types/auth';
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context';

/** Convert a Supabase error into a friendly, user-facing message. */
function toMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

const profileKey = (userId: string) => `gym-tracker:profile:${userId}`;

function readCachedProfile(userId: string): Profile | null {
  try {
    const raw = window.localStorage.getItem(profileKey(userId));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(userId: string, profile: Profile | null): void {
  try {
    if (profile) window.localStorage.setItem(profileKey(userId), JSON.stringify(profile));
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Auth works offline once signed in: the saved session is used even when its
 * access token can't be refreshed without a connection, and the profile comes
 * from a cache on this device. The profile is fetched from the database only
 * right after signing in and when the user presses "Sync to cloud".
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  // Start from the session saved on this device, so the app opens instantly
  // even offline or on a connection that hangs. Supabase confirms or refreshes
  // it in the background (that can take ~30 s of retries without a network).
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [profile, setProfile] = useState<Profile | null>(() => {
    const stored = readStoredSession();
    return stored ? readCachedProfile(stored.user.id) : null;
  });
  // Only wait for Supabase when nothing is saved (first sign-in, OAuth return).
  const [loading, setLoading] = useState(() => readStoredSession() == null);

  // Avoid setting state after unmount.
  const mounted = useRef(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Offline, or the migration hasn't been applied — keep the cached copy.
        console.warn('Could not load profile:', error.message);
        return;
      }
      const next = (data as Profile) ?? null;
      writeCachedProfile(userId, next);
      if (mounted.current) setProfile(next);
    },
    [supabase],
  );

  useEffect(() => {
    mounted.current = true;

    const adopt = (next: Session) => {
      setSession(next);
      setProfile(readCachedProfile(next.user.id));
    };

    // Confirm the initial session in the background. Offline with an expired
    // token, Supabase reports none; keep the session saved on this device.
    // A revoked sign-in arrives as SIGNED_OUT below.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return;
        const initial = data.session ?? readStoredSession();
        if (initial) adopt(initial);
      })
      .catch(() => {
        const stored = readStoredSession();
        if (mounted.current && stored) adopt(stored);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    // React to future auth changes (sign in/out, token refresh, recovery).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted.current) return;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        return;
      }
      // A null session for any other reason (e.g. offline refresh failure) is
      // not a sign-out; keep using the saved one.
      if (!nextSession) return;
      adopt(nextSession);
      if (event === 'SIGNED_IN' && !readCachedProfile(nextSession.user.id)) {
        // Signing in needs a connection anyway; fetch the profile once.
        void loadProfile(nextSession.user.id);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(async () => {
    const id = session?.user.id;
    if (id) await loadProfile(id);
  }, [session, loadProfile]);

  const signInWithPassword = useCallback(
    async (email: string, password: string, remember: boolean) => {
      setRemember(remember);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? toMessage(error) : null };
    },
    [supabase],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, fullName: string) => {
      setRemember(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      // When email confirmation is on, no session is returned until confirmed.
      const needsConfirmation = !error && !data.session;
      return { error: error ? toMessage(error) : null, needsConfirmation };
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async () => {
    setRemember(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error ? toMessage(error) : null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    // Unsynced data stays on this device (keyed by user) for the next sign-in.
    const { error } = await supabase.auth.signOut().catch((e: unknown) => ({ error: e }));
    if (error) {
      // Offline: the server call failed, so clear the saved session locally.
      clearStoredSession();
    }
    if (mounted.current) {
      setSession(null);
      setProfile(null);
    }
  }, [supabase]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ? toMessage(error) : null };
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error ? toMessage(error) : null };
    },
    [supabase],
  );

  const user: User | null = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
