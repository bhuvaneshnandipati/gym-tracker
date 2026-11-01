import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { LocalDataGate } from '@/components/LocalDataGate';

/**
 * Gate for protected routes: redirects to /login when signed out, then loads
 * the user's on-device data. A remembered sign-in works offline.
 */
export function RequireAuth() {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!session || !user) {
    // Remember where the user was headed so we can return them after login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <LocalDataGate userId={user.id}>
      <Outlet />
    </LocalDataGate>
  );
}
