import { ViewModelStoreBase, type ViewModelStoreConfig } from 'mobx-view-model';

export class ViewModelStoreImpl extends ViewModelStoreBase {
  constructor(config?: ViewModelStoreConfig) {
    super({
      ...config,
      vmConfig: {
        observable: {
          viewModelStores: {
            useDecorators: false,
          },
          viewModels: {
            useDecorators: false,
          },
        },
      },
    });
  }
}
