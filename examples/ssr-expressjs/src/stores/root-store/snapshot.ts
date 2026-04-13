import { sleep } from 'yummies/async';
import { getAppInfoStoreSnapshot } from '../app-info-store/snapshot.js';
import type { RootStoreSnapshot } from './index.js';

export async function getRootStoreSnapshot(): Promise<RootStoreSnapshot> {
  await sleep(50);

  return {
    appInfo: await getAppInfoStoreSnapshot(),
  };
}
