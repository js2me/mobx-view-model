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

// Runtime fields and lifecycle methods present in supported core 8–10 builds,
// but removed or moved into `vm` in core 11. Legacy packages are test-only.
const legacyBaseKeys = [
  'vmParams',
  'vmConfig',
  'isPayloadEqual',
  '_isMounted',
  '_isUnmounting',
  '_payload',
  'isUnmounting',
  'finalizeUnmount',
  'beginUnmounting',
  'payloadChanged',
  'getParentViewModel',
];

let viewModelBaseKeys: ReadonlySet<string> | null = null;

export const getViewModelBaseKeys = (): ReadonlySet<string> => {
  if (!viewModelBaseKeys) {
    viewModelBaseKeys = new Set([
      ...getAllKeys(new ViewModelBaseKeysProbe()),
      ...legacyBaseKeys,
    ]);
  }

  return viewModelBaseKeys;
};
