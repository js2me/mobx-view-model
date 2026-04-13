import {
  type AnyViewModel,
  mergeVMConfigs,
  type ViewModelCreateConfig,
  ViewModelStoreBase,
  type ViewModelStoreConfig,
} from 'mobx-view-model';
import type { RootStore } from '../../stores/root-store/index.js';

export class VMStore extends ViewModelStoreBase {
  constructor(
    private rootStore: RootStore,
    config?: ViewModelStoreConfig,
  ) {
    super(config);
  }

  createViewModel<VM extends AnyViewModel>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    return new config.VM(this.rootStore, {
      ...config,
      vmConfig: mergeVMConfigs(this.vmConfig, config.vmConfig),
    });
  }
}
