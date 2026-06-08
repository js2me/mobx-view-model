import { ViewModelBase } from 'mobx-view-model';
import { getAllKeys } from './get-all-keys';

class ViewModelBaseKeysProbe extends ViewModelBase {
  constructor() {
    super({
      id: '__mobx-view-model-devtools-probe__',
      payload: {},
      viewModels: {
        get: () => null,
        has: () => false,
      } as never,
    });
  }
}

let viewModelBaseKeys: ReadonlySet<string> | null = null;

export const getViewModelBaseKeys = (): ReadonlySet<string> => {
  if (!viewModelBaseKeys) {
    viewModelBaseKeys = new Set(getAllKeys(new ViewModelBaseKeysProbe()));
  }

  return viewModelBaseKeys;
};
