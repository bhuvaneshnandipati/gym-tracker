import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/validation';

/**
 * Reached from the email reset link. Supabase parses the recovery token from
 * the URL and establishes a temporary session, which lets updateUser() set a
 * new password.
 */
export function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // After a successful change, send the user to the dashboard.
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => navigate('/', { replace: true }), 1500);
    return () => window.clearTimeout(timer);
  }, [done, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await updatePassword(values.password);
    if (error) {
      setFormError(error);
      return;
    }
    setDone(true);
  });

  const noRecoverySession = !loading && !session;

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you don't use elsewhere."
      footer={
        <Link
          to="/login"
          className="font-medium text-flame-600 hover:underline dark:text-flame-500"
        >
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <Alert tone="success">Password updated. Redirecting you to your dashboard…</Alert>
      ) : noRecoverySession ? (
        <Alert tone="error">
          This reset link is invalid or has expired. Request a new one from the{' '}
          <Link to="/forgot-password" className="font-medium underline">
            forgot password
          </Link>{' '}
          page.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <PasswordInput
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Update password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
