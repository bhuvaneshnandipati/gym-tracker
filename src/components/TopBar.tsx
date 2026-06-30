import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { UserMenu } from '@/components/UserMenu';

/** Sticky header bar shown on every app page. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-iron-200 bg-iron-50/80 px-4 backdrop-blur dark:border-iron-800 dark:bg-iron-950/80 sm:px-6">
      {/* Logo appears here only on mobile; the sidebar carries it on desktop. */}
      <div className="lg:hidden">
        <Logo showText={false} />
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
