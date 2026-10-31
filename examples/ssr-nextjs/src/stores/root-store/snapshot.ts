import { sleep } from 'yummies/async';
import type { RootStoreSnapshot } from '@/stores/root-store';
import { getAppInfoStoreSnapshot } from '../app-info-store/snapshot';

/** Default serializable snapshot for `rootStoreSnapshot` (via {@link withRootStoreProps}). */
export async function getRootStoreSnapshot(): Promise<RootStoreSnapshot> {
  await sleep(50);

  return {
    appInfo: await getAppInfoStoreSnapshot(),
  };
}
