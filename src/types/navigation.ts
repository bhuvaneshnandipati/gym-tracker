import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  /** Route path this item links to. */
  to: string;
  /** Visible label. */
  label: string;
  /** Icon component rendered alongside the label. */
  icon: LucideIcon;
  /** Match the route exactly (used for the index route). */
  end?: boolean;
  /** Set to false to hide the item from the mobile bottom bar (default: shown). */
  mobile?: boolean;
}
