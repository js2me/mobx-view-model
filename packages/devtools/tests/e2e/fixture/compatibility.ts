import { configure } from 'mobx';

// Exercise the bridge even when the host and the standalone bundle cannot
// share MobX reactions (e.g. different MobX versions or isolated runtimes).
configure({ enforceActions: 'never', isolateGlobalState: true });

const params = new URLSearchParams(location.search);

async function loadDevtools() {
  if (params.get('popup') === 'persisted-open') {
    localStorage.setItem('mobx-view-model-devtools/isPopupOpened', 'true');
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../../dist/auto.global.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  if (params.get('popup') !== 'persisted-open') {
    (globalThis as any).ViewModelDevtools.define().showPopup();
  }
}

if (params.get('order') === 'devtools-first') await loadDevtools();

const core =
  params.get('core') === '9'
    ? await import('mobx-view-model-v9')
    : params.get('core') === '10'
      ? await import('mobx-view-model-v10')
      : await import('mobx-view-model');

let store = new core.ViewModelStoreBase();
class CompatibilityVM extends core.ViewModelBase {}
async function register(VM: any, id: string) {
  const config = { VM, id, payload: {}, viewModels: store };
  if ('define' in store) return (store as any).define(config);
  const vm = (store as any).createViewModel(config);
  await (store as any).attach(vm);
  return vm;
}
await register(CompatibilityVM, 'compatibility');

if (params.get('order') !== 'devtools-first') await loadDevtools();

Object.assign(globalThis, {
  compatibility: {
    async add() {
      class AddedVM extends core.ViewModelBase {}
      await register(AddedVM, 'added');
    },
    async replace() {
      const map = (store as any).viewModels;
      map.delete('added');
      class ReplacementVM extends core.ViewModelBase {}
      await register(ReplacementVM, 'replacement');
    },
    remove() {
      (store as any).viewModels.delete('replacement');
    },
    async newStore() {
      store = new core.ViewModelStoreBase();
      class NewStoreVM extends core.ViewModelBase {}
      await register(NewStoreVM, 'new-store');
    },
  },
});
