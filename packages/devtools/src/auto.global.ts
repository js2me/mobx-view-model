import { viewModelsConfig } from 'mobx-view-model';
import { ViewModelDevtools } from './model';
import { ViewModelStoreImpl } from './model/lib/view-model-store.impl';

Object.assign(globalThis, {
  ViewModelDevtools,
});

const lastCreatedStore = viewModelsConfig.hooks.storeCreate.lastPub?.[0];

ViewModelDevtools.define({
  position: 'top-right',
  defaultIsOpened: false,
});

ViewModelDevtools.connectExtras({
  globalThis,
});

const connectStore = (store: any) => {
  if (ViewModelStoreImpl === store.constructor) {
    return;
  }

  ViewModelDevtools.connectViewModels(store as any);
};

if (lastCreatedStore) {
  connectStore(lastCreatedStore);
}
viewModelsConfig.hooks.storeCreate.sub(connectStore);

