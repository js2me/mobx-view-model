import {
  type AnyViewModel,
  mergeVMConfigs,
  type ViewModelCreateConfig,
  ViewModelStoreBase,
  type ViewModelStoreConfig,
} from 'mobx-view-model';
import type { Globals } from '../../../globals';

export class VMStore extends ViewModelStoreBase {
  constructor(
    private globals: Globals,
    config?: ViewModelStoreConfig,
  ) {
    super(config);
  }

  createViewModel<VM extends AnyViewModel>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    return new config.VM(this.globals, {
      ...config,
      vmConfig: mergeVMConfigs(this.vmConfig, config.vmConfig),
    });
  }
}
