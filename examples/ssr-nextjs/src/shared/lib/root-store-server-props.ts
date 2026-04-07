import type { RootStoreInitialSnapshot } from '@/stores/root-store';

/**
 * Next.js does not support `getServerSideProps` on `_app`.
 * Merge this into each page’s `getServerSideProps` return value, then read
 * `pageProps.rootStoreSnapshot` in `_app` and pass it to `RootProviders`.
 */
export type WithRootStorePageProps<P extends Record<string, unknown>> = P & {
  rootStoreSnapshot: RootStoreInitialSnapshot;
};

export function getRootStoreSnapshotForRequest(): RootStoreInitialSnapshot {
  return {
    appInfo: {
      appName: 'Server Side App Name',
      environment:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
    },
  };
}

export function mergeRootStorePageProps<P extends Record<string, unknown>>(
  props: P,
): WithRootStorePageProps<P> {
  return {
    ...props,
    rootStoreSnapshot: getRootStoreSnapshotForRequest(),
  };
}
