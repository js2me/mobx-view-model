'use client';

import './bootstrap/client';
import { RootStoreProvider } from '@/stores/root-store/components/provider';
import { RootStore } from '@/stores/root-store';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [rootStore] = useState(() => new RootStore());

  return <RootStoreProvider store={rootStore}>{children}</RootStoreProvider>;
}
