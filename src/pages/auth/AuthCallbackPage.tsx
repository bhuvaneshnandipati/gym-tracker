import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { AuthCard } from '@/components/auth/AuthCard';
import { Alert } from '@/components/ui/Alert';

/**
 * Landing page for OAuth and email-confirmation redirects. Supabase parses the
 * session from the URL automatically; we just wait for it and forward the user.
 */
export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  // Surface a clear error if the provider returned one in the URL.
  const params = new URLSearchParams(window.location.hash.replace('#', '?'));
  const urlError = params.get('error_description') ?? params.get('error');

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
      return;
    }
    if (!loading) {
      // Give Supabase a moment to exchange the code, then show a fallback.
      const timer = window.setTimeout(() => setTimedOut(true), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [session, loading, navigate]);

  if (urlError || timedOut) {
    return (
      <AuthCard title="Sign-in could not complete" subtitle="Let's try that again.">
        <Alert tone="error">
          {urlError ??
            'We could not finish signing you in. Please return to the login page and retry.'}
        </Alert>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="mt-4 h-11 w-full rounded-xl bg-flame-600 text-sm font-medium text-white transition-colors hover:bg-flame-700"
        >
          Back to sign in
        </button>
      </AuthCard>
    );
  }

  return <FullPageSpinner />;
}
