import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'primary' | 'secondary' | 'danger';

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  children: ReactNode;
}

const tones: Record<Tone, string> = {
  primary: 'bg-flame-600 text-white hover:bg-flame-700 active:bg-flame-800',
  secondary:
    'bg-iron-100 text-iron-900 hover:bg-iron-200 dark:bg-iron-800 dark:text-iron-100 dark:hover:bg-iron-700',
  danger:
    'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60',
};

/**
 * Oversized control for use mid-workout (sweaty hands, phone on a bench):
 * at least 56px tall, full-width on phones. Styling follows the shared Button.
 */
export function BigButton({
  tone = 'secondary',
  className,
  type = 'button',
  ...props
}: BigButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-14 min-w-[3.5rem] select-none items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Accessible on/off switch (role="switch"). */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl py-2 text-left disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-medium text-iron-800 dark:text-iron-200">{label}</span>
        {description ? (
          <span className="block text-xs text-iron-500 dark:text-iron-400">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-flame-600' : 'bg-iron-300 dark:bg-iron-700',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  );
}
