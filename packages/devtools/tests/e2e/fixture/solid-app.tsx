import { action, computed, makeObservable, observable } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import {
  enableObservableTracking,
  useCreateViewModel,
  ViewModelsProvider,
  withViewModel,
} from 'mobx-view-model-solid';
import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';

enableObservableTracking();

class SolidAppVM extends ViewModelBase {}

class SolidCounterVM extends ViewModelBase {
  count = 2;

  constructor(params: ViewModelParams) {
    super(params);
    makeObservable(this, {
      count: observable,
      doubled: computed,
      increment: action,
    });
  }

  get doubled() {
    return this.count * 2;
  }

  increment = () => {
    this.count++;
  };
}

function Counter() {
  const model = useCreateViewModel(SolidCounterVM, {}, { id: 'solid-counter' });
  return (
    <section aria-label="Solid counter">
      <output aria-label="Count">{model.count}</output>
      <output aria-label="Doubled">{model.doubled}</output>
      <button type="button" onClick={model.increment}>
        Increment
      </button>
    </section>
  );
}

const App = withViewModel(
  SolidAppVM,
  () => {
    const [visible, setVisible] = createSignal(true);
    return (
      <>
        <button type="button" onClick={() => setVisible((value) => !value)}>
          Toggle counter
        </button>
        <Show when={visible()}>
          <Counter />
        </Show>
      </>
    );
  },
  { id: 'solid-app' },
);

export function mountApp(element: Element) {
  const store = new ViewModelStoreBase({
    vmConfig: { observable: { viewModels: { useDecorators: false } } },
  });
  const dispose = render(
    () => (
      <ViewModelsProvider value={store}>
        <App />
      </ViewModelsProvider>
    ),
    element,
  );
  const unmount = document.createElement('button');
  unmount.textContent = 'Unmount Solid app';
  unmount.onclick = dispose;
  document.body.appendChild(unmount);
  return store;
}
