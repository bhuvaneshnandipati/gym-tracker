import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/FullPageSpinner';

/** Gate for protected routes: redirects to /login when signed out. */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!session) {
    // Remember where the user was headed so we can return them after login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
