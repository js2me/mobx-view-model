import { ViewModelBase } from './view-model.base.js';
import { ViewModelStoreBase } from './view-model.store.base.js';

export * from './view-model.js';
export * from './view-model.store.js';
export * from './view-model.store.types.js';
export * from './view-model.types.js';
export * from './view-model.base.js';
export * from './view-model.store.base.js';

/**
 * @deprecated use {@link ViewModelBase}
 */
export const ViewModelImpl = ViewModelBase;

/**
 * @deprecated use {@link ViewModelStoreBase}
 */
export const ViewModelStoreImpl = ViewModelStoreBase;
