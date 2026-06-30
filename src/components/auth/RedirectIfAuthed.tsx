import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/FullPageSpinner';

/** Wrapper for auth pages: sends already-signed-in users to the dashboard. */
export function RedirectIfAuthed() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/" replace />;

  return <Outlet />;
}
