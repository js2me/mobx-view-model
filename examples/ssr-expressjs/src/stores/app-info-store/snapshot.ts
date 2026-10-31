import type { AppInfoSnapshot } from './index.js';

export async function getAppInfoStoreSnapshot(): Promise<
  Partial<AppInfoSnapshot>
> {
  return {
    appName: 'Server Side App Name',
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
  };
}
