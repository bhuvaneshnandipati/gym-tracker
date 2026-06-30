import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/lib/navigation';
import { Logo } from '@/components/Logo';
import { cn } from '@/utils/cn';

/** Persistent left navigation, visible on large screens only. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-iron-200 bg-white dark:border-iron-800 dark:bg-iron-900 lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-flame-50 text-flame-700 dark:bg-flame-950/40 dark:text-flame-400'
                  : 'text-iron-600 hover:bg-iron-100 hover:text-iron-900 dark:text-iron-400 dark:hover:bg-iron-800 dark:hover:text-iron-100',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 text-xs text-iron-400 dark:text-iron-600">
        Built for lifters. v0.1.0
      </div>
    </aside>
  );
}
