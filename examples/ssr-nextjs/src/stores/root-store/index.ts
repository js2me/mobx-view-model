import { ViewModelStoreBase } from 'mobx-view-model';

/**
 * Application root: add domain stores here alongside the view-model store.
 */
export class RootStore {
  readonly viewModels = new ViewModelStoreBase();
}
