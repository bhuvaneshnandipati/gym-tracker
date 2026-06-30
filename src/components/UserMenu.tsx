import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

function initialsFrom(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || 'U';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Avatar button that opens a small menu with settings and sign-out. */
export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const name = profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? null;
  const email = user?.email ?? null;
  const avatarUrl =
    profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-iron-200 text-sm font-semibold text-iron-700 ring-2 ring-transparent transition hover:ring-flame-500/40 dark:bg-iron-700 dark:text-iron-100"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsFrom(name, email)
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-iron-200 bg-white shadow-card dark:border-iron-800 dark:bg-iron-900 dark:shadow-card-dark"
        >
          <div className="border-b border-iron-100 px-4 py-3 dark:border-iron-800">
            <p className="truncate text-sm font-medium text-iron-900 dark:text-iron-50">
              {name ?? 'Lifter'}
            </p>
            {email ? (
              <p className="truncate text-xs text-iron-500 dark:text-iron-400">{email}</p>
            ) : null}
          </div>
          <MenuButton
            icon={SettingsIcon}
            label="Settings"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
          />
          <MenuButton icon={LogOut} label="Sign out" onClick={handleSignOut} danger />
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof LogOut;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
          : 'text-iron-700 hover:bg-iron-100 dark:text-iron-200 dark:hover:bg-iron-800',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
