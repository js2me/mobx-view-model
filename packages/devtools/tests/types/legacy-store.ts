import type { ViewModelStoreBase as Core8Store } from 'mobx-view-model-v8';
import type { ViewModelStoreBase as Core8InitialStore } from 'mobx-view-model-v8-initial';
import type { ViewModelStoreBase as Core9Store } from 'mobx-view-model-v9';
import type { ViewModelStoreBase as Core10Store } from 'mobx-view-model-v10';
import type { ViewModelDevtools } from '../../src';

type StoreInput = NonNullable<Parameters<typeof ViewModelDevtools.connect>[0]>;

// Older core stores must be accepted directly, without as-never adapter casts.
export function legacyStoreInputs(
  early8: Core8InitialStore,
  late8: Core8Store,
  core9: Core9Store,
  core10: Core10Store,
): StoreInput[] {
  return [early8, late8, core9, core10];
}
