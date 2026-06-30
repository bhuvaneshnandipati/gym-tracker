import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RedirectIfAuthed } from '@/components/auth/RedirectIfAuthed';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WorkoutEditorPage } from '@/pages/WorkoutEditorPage';
import { WorkoutDetailPage } from '@/pages/WorkoutDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';

/** Route table. Protected app routes sit behind RequireAuth. */
// Charts pull in Recharts; lazy-load so it stays out of the initial bundle.
const ProgressPage = lazy(() =>
  import('@/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })),
);
const BodyMetricsPage = lazy(() =>
  import('@/pages/BodyMetricsPage').then((m) => ({ default: m.BodyMetricsPage })),
);

export function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public auth routes — redirect to dashboard if already signed in. */}
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Reachable while a recovery/OAuth session is being established. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected application. */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="body" element={<BodyMetricsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="workout/new" element={<WorkoutEditorPage />} />
            <Route path="workout/:id/edit" element={<WorkoutEditorPage />} />
            <Route path="workout/:id" element={<WorkoutDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
