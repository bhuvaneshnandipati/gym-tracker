import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { signupSchema, type SignupValues } from '@/lib/validation';

export function SignupPage() {
  const { signUpWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error, needsConfirmation } = await signUpWithPassword(
      values.email,
      values.password,
      values.fullName,
    );
    if (error) {
      setFormError(error);
      return;
    }
    if (needsConfirmation) {
      setConfirmEmail(values.email);
      return;
    }
    navigate('/', { replace: true });
  });

  const onGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setFormError(error);
      setGoogleLoading(false);
    }
  };

  if (confirmEmail) {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle="One more step to finish signing up."
        footer={
          <Link
            to="/login"
            className="font-medium text-flame-600 hover:underline dark:text-flame-500"
          >
            Back to sign in
          </Link>
        }
      >
        <Alert tone="success">
          We sent a confirmation link to <strong>{confirmEmail}</strong>. Click it to activate your
          account, then sign in.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start tracking your workouts in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-flame-600 hover:underline dark:text-flame-500"
          >
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} loading={googleLoading} label="Sign up with Google" />

      <div className="my-5 flex items-center gap-3 text-xs text-iron-400">
        <span className="h-px flex-1 bg-iron-200 dark:bg-iron-800" />
        OR
        <span className="h-px flex-1 bg-iron-200 dark:bg-iron-800" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Alex Lifter"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
