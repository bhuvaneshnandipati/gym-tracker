import { Dumbbell, History, LineChart, Ruler, Settings } from 'lucide-react';
import type { NavItem } from '@/types/navigation';

/**
 * Single source of truth for the app's primary navigation.
 * Both the desktop sidebar and the mobile bottom bar render from this list.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Dumbbell, end: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/body', label: 'Body', icon: Ruler },
  { to: '/settings', label: 'Settings', icon: Settings },
];
