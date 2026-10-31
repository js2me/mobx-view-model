import type { GetServerSideProps, PreviewData } from 'next';
import type { ParsedUrlQuery } from 'node:querystring';
import type { RootStoreSnapshot } from '@/stores/root-store';
import { getRootStoreSnapshot } from '../snapshot';

/**
 * Next.js does not support `getServerSideProps` on `_app`.
 * Wrap each page’s `getServerSideProps` with {@link withRootStoreProps} so
 * `pageProps.rootStoreSnapshot` is set; `_app` reads it when creating `RootStore`.
 */
export type WithRootStorePageProps<P extends Record<string, unknown>> = P & {
  rootStoreSnapshot: RootStoreSnapshot;
};

/**
 * Wraps `getServerSideProps`: injects `rootStoreSnapshot` into `props` and
 * forwards `redirect` / `notFound` unchanged.
 */
export function withRootStoreProps<
  P extends Record<string, unknown>,
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData,
>(
  getServerSideProps: GetServerSideProps<P, Q, D>,
): GetServerSideProps<WithRootStorePageProps<P>, Q, D> {
  return async (context) => {
    const result = await getServerSideProps(context);
    if (!('props' in result)) {
      return result;
    }
    const raw = result.props;
    const props = raw instanceof Promise ? await raw : raw;
    return {
      props: {
        ...props,
        rootStoreSnapshot: await getRootStoreSnapshot(),
      },
    };
  };
}
