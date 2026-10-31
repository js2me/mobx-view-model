import { VM } from '../../shared/lib/vm.js';

export class AppNavVM extends VM {
  title = this.rootStore.appInfo.appName;

  chips = [
    'CSR',
    'React 19',
    'mobx-view-model',
    this.rootStore.appInfo.environment,
  ];
}
