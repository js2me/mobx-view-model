import { AppInfoSnapshot, AppInfoStore } from '@/stores/app-info-store';
import { VMStore } from '@/shared/lib/vm-store';
import { NextRouter } from 'next/router';

/** Serializable input for `RootStore` (e.g. from `getServerSideProps`). */
export type RootStoreInitialSnapshot = {
  appInfo?: Partial<AppInfoSnapshot>;
  router?: NextRouter;
};

/**
 * Application root: add domain stores here alongside the view-model store.
 */
export class RootStore {
  readonly appInfo;
  readonly viewModels;
  readonly router;

  constructor(snapshot?: RootStoreInitialSnapshot) {
     this.appInfo = new AppInfoStore(snapshot?.appInfo);
     this.router = snapshot?.router;
     this.viewModels = new VMStore(this, {
      vmConfig: {
        observable: {
          viewModels: {
            useDecorators: false
          },
          viewModelStores: {
            useDecorators: false,
          }
        },
      },
    })
  }
}
