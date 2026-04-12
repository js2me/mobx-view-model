import type { ComponentType } from 'react';

export interface LayoutNavItem {
  badge?: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

export interface LayoutQuickLink {
  href: string;
  label: string;
}
