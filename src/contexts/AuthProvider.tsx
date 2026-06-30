import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, setRemember } from '@/lib/supabase';
import type { Profile } from '@/types/auth';
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context';

/** Convert a Supabase error into a friendly, user-facing message. */
function toMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Most likely the migration hasn't been applied yet — degrade gracefully.
        console.warn('Could not load profile:', error.message);
        if (mounted.current) setProfile(null);
        return;
      }
      if (mounted.current) setProfile((data as Profile) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    mounted.current = true;

    // Resolve the initial session.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      if (data.session?.user) void loadProfile(data.session.user.id);
      setLoading(false);
    });

    // React to future auth changes (sign in/out, token refresh, recovery).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return;
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

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
    await supabase.auth.signOut();
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
