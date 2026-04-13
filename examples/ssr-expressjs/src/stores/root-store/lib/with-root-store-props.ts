import type { RootStoreSnapshot } from '../index.js';
import { getRootStoreSnapshot } from '../snapshot.js';

export type WithRootStorePageProps<P extends Record<string, unknown>> = P & {
  rootStoreSnapshot: RootStoreSnapshot;
};

export function withRootStoreProps<P extends Record<string, unknown>>(
  loader: () => Promise<{ props: P }>,
): () => Promise<{ props: WithRootStorePageProps<P> }> {
  return async () => {
    const result = await loader();
    return {
      props: {
        ...result.props,
        rootStoreSnapshot: await getRootStoreSnapshot(),
      },
    };
  };
}
