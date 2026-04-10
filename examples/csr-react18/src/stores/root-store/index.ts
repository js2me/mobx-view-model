import { type AppInfoSnapshot, AppInfoStore } from '../app-info-store/index.js';
import { VMStore } from '../../shared/lib/vm-store.js';

export type RootStoreSnapshot = {
  appInfo?: Partial<AppInfoSnapshot>;
};

export class RootStore {
  readonly appInfo;
  readonly viewModels;

  constructor(snapshot: RootStoreSnapshot) {
    this.appInfo = new AppInfoStore(snapshot.appInfo);
    this.viewModels = new VMStore(this, {
      vmConfig: {
        observable: {
          viewModels: { useDecorators: false },
          viewModelStores: { useDecorators: false },
        },
      },
    });
  }
}
