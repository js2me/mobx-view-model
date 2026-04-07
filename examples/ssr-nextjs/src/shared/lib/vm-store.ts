import { RootStore } from "@/stores/root-store";
import { AnyViewModel, mergeVMConfigs, ViewModelCreateConfig, ViewModelStoreBase, ViewModelStoreConfig } from "mobx-view-model";


export class VMStore extends ViewModelStoreBase {
  constructor(private rootStore: RootStore, config?: ViewModelStoreConfig) {
    super(config);
  }

  createViewModel<VM extends AnyViewModel>(config: ViewModelCreateConfig<VM>): VM {
    return new config.VM(this.rootStore, {
      ...config,
      vmConfig: mergeVMConfigs(this.vmConfig, config.vmConfig)
    });
  }
}