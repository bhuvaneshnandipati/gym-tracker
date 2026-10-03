import { Dumbbell, History, LineChart, Ruler, Settings, Timer } from 'lucide-react';
import type { NavItem } from '@/types/navigation';

/**
 * Single source of truth for the app's primary navigation.
 * Both the desktop sidebar and the mobile bottom bar render from this list.
 * The bottom bar fits five items, so Settings is desktop-only there (it stays
 * reachable on phones from the avatar menu in the top bar).
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Dumbbell, end: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/timer', label: 'Timer', icon: Timer },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/body', label: 'Body', icon: Ruler },
  { to: '/settings', label: 'Settings', icon: Settings, mobile: false },
];

/** Items shown in the mobile bottom bar. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.mobile !== false);
