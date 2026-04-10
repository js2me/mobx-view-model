import { sleep } from 'yummies/async';
import type { RootStoreSnapshot } from './index.js';
import { getAppInfoStoreSnapshot } from '../app-info-store/snapshot.js';

export async function getRootStoreSnapshot(): Promise<RootStoreSnapshot> {
  await sleep(50);

  return {
    appInfo: await getAppInfoStoreSnapshot(),
  };
}
