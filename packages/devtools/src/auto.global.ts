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

const devtools = ViewModelDevtools.define();

function watchStoreVmChanges(store: any) {
  // The devtools bundles its own MobX, so it can't observe the host's
  // ObservableMap. In the vite-plugin we bridge via the host's autorun;
  // here (UMD) we don't have it, so we poll — but only while the
  // popup is open to avoid wasted work.
  let prevSize = -1;
  let timer: ReturnType<typeof setInterval> | undefined;

  const check = () => {
    const size = (store as any).viewModels?.size ?? 0;
    if (size !== prevSize) {
      prevSize = size;
      devtools.notifyVmChange();
    }
  };

  const start = () => {
    if (timer) return;
    check();
    timer = setInterval(check, 500);
  };

  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };

  devtools.onPopupOpen(start);
  devtools.onPopupClose(stop);
}

const connectStore = (store: any) => {
  if (ViewModelStoreImpl === store.constructor) {
    return;
  }

  ViewModelDevtools.connectViewModels(store as any);
  watchStoreVmChanges(store);
};

if (lastCreatedStore) {
  connectStore(lastCreatedStore);
}
viewModelsConfig.hooks.storeCreate.sub(connectStore);
