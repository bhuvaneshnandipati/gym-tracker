import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginValues } from '@/lib/validation';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/';

  const [formError, setFormError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await signInWithPassword(values.email, values.password, values.remember);
    if (error) {
      setFormError(error);
      return;
    }
    navigate(from, { replace: true });
  });

  const onGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setFormError(error);
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google, so no further action needed.
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to log your next session."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-flame-600 hover:underline dark:text-flame-500"
          >
            Create one
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} loading={googleLoading} />

      <div className="my-5 flex items-center gap-3 text-xs text-iron-400">
        <span className="h-px flex-1 bg-iron-200 dark:bg-iron-800" />
        OR
        <span className="h-px flex-1 bg-iron-200 dark:bg-iron-800" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-iron-600 dark:text-iron-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-iron-300 text-flame-600 focus:ring-flame-500 dark:border-iron-600 dark:bg-iron-800"
              {...register('remember')}
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-flame-600 hover:underline dark:text-flame-500"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
