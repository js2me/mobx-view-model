import { useState } from 'react';
import { useRouter } from 'next/router';
import { getRootStoreSnapshotForRequest } from '@/shared/lib/root-store-server-props';
import { RootStore } from '..';
import { RootStoreProvider } from './provider';

/**
 * Routes without `getServerSideProps` (e.g. static `/404`) have no
 * `rootStoreSnapshot`; fall back to the same defaults as
 * `mergeRootStorePageProps`.
 */
export const withRootStore = (Component: any) => (props: any) => {
  const router = useRouter();
  const [rootStore] = useState(() => {
    const snapshot =
      props.pageProps?.rootStoreSnapshot ?? getRootStoreSnapshotForRequest();
    return new RootStore({ ...snapshot, router });
  });

  return (
    <RootStoreProvider store={rootStore}>
      <Component {...props} />
    </RootStoreProvider>
  );
};