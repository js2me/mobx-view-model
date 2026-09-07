import { RootStore } from "@/stores/root-store";
import {
  AnyViewModel,
  AnyViewModelSimple,
  isViewModelSimpleClass,
  mergeVMConfigs,
  ViewModelCreateConfig,
  ViewModelStoreBase,
  ViewModelStoreConfig,
} from "mobx-view-model";


export class VMStore extends ViewModelStoreBase {
  constructor(private rootStore: RootStore, config?: ViewModelStoreConfig) {
    super(config);
  }

  create<VM extends AnyViewModel | AnyViewModelSimple>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    if (isViewModelSimpleClass(config.VM)) {
      return new config.VM() as VM;
    }

    return new (config.VM as any)(this.rootStore, {
      ...config,
      vmConfig: mergeVMConfigs(this.vmConfig, config.vmConfig),
    });
  }
}
