import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileNav } from '@/components/MobileNav';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { MiniTimerPill } from '@/components/timer/MiniTimerPill';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

/** The shell wrapping every authenticated app route. */
export function AppLayout() {
  // Keep queries fresh when changes arrive from other devices.
  useRealtimeSync();

  return (
    <div className="flex h-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-flame-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <TopBar />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 pb-28 pt-6 outline-none sm:px-6 lg:pb-10"
        >
          <div className="mx-auto w-full max-w-6xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      <MiniTimerPill />
      <FloatingActionButton />
    </div>
  );
}
