import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/auth';

export interface AuthResult {
  error: string | null;
}

export interface AuthContextValue {
  /** Current Supabase session, or null when signed out. */
  session: Session | null;
  /** Convenience accessor for the signed-in user. */
  user: User | null;
  /** The user's profile row, loaded after authentication. */
  profile: Profile | null;
  /** True until the initial session check completes. */
  loading: boolean;

  signInWithPassword: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<AuthResult & { needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
