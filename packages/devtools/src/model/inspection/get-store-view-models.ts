import type { ViewModelStoreSource } from '../devtools-config';
import type { AnyVM } from '../types';

/** Validate the protected runtime enumeration API shared by core 8–11 stores. */
export function getStoreViewModels(
  store: ViewModelStoreSource,
): Iterable<AnyVM> {
  const collection =
    store && typeof store === 'object'
      ? Reflect.get(store, 'viewModels')
      : undefined;
  const values =
    typeof collection?.values === 'function' ? collection.values() : undefined;
  if (!values || typeof values[Symbol.iterator] !== 'function') {
    throw new TypeError(
      'Unsupported ViewModel store: viewModels.values() must return an iterable. Pass a core 8–11 ViewModelStore instance.',
    );
  }
  return values;
}
