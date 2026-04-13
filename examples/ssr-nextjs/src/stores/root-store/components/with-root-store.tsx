import { useState } from 'react';
import { useRouter } from 'next/router';
import { RootStore } from '..';
import { RootStoreProvider } from './provider';

/**
 * Merges `pageProps.rootStoreSnapshot` with `router` from {@link useRouter}.
 * Data routes should set the snapshot (e.g. {@link withRootStoreProps}). Static pages
 * (e.g. `/404`) have no `getServerSideProps` — snapshot is omitted; **`AppInfoStore`**
 * then uses its constructor defaults.
 */
export const withRootStore = (Component: any) => (props: any) => {
  const router = useRouter();
  const [rootStore] = useState(() => {
    const snapshot = props.pageProps?.rootStoreSnapshot;
    return new RootStore({ ...snapshot, router });
  });

  return (
    <RootStoreProvider store={rootStore}>
      <Component {...props} />
    </RootStoreProvider>
  );
};