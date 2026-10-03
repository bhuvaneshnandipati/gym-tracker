import { NavLink } from 'react-router-dom';
import { MOBILE_NAV_ITEMS } from '@/lib/navigation';
import { cn } from '@/utils/cn';

/** Fixed bottom navigation, visible on small screens only. */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-iron-200 bg-white/95 backdrop-blur dark:border-iron-800 dark:bg-iron-900/95 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-flame-600 dark:text-flame-500'
                    : 'text-iron-500 hover:text-iron-800 dark:text-iron-400 dark:hover:text-iron-100',
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
