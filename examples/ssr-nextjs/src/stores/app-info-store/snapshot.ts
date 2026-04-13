import type { AppInfoSnapshot } from '.';

/** App-info slice for SSR (`withRootStoreProps` → `getRootStoreSnapshot`). */
export async function getAppInfoStoreSnapshot(): Promise<Partial<AppInfoSnapshot>> {
  return {
    appName: 'Server Side App Name',
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
  };
}
