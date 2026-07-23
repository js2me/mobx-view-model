<img src="https://js2me.github.io/mobx-view-model/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model-solid

[![NPM version][npm-image]][npm-url]


[npm-image]: http://img.shields.io/npm/v/mobx-view-model-solid.svg
[npm-url]: http://npmjs.org/package/mobx-view-model-solid

⚡ SolidJS bindings for [mobx-view-model](https://www.npmjs.com/package/mobx-view-model) | HOCs, hooks & providers ⚡

Solid integration layer for the MVVM library — connect ViewModels to components via `withViewModel`, `useCreateViewModel`, `ViewModelsProvider`, and more.

MobX ↔ Solid reactivity is powered by [mobx-solid](https://js2me.github.io/mobx-solid/llms.txt) (`enableObservableTracking` / `obs`). No `observer` wrappers required.

## Install

```bash
pnpm add mobx-view-model-solid mobx-view-model mobx-solid mobx solid-js
```

## Quick start

Call `enableObservableTracking()` once at the app entry (also re-exported from this package). Hooks/HOCs call it as a safety net.

```tsx
import { enableObservableTracking } from 'mobx-view-model-solid';
import { render } from 'solid-js/web';

enableObservableTracking();

render(() => <App />, document.getElementById('app')!);
```

### HOC

```tsx
import { ViewModelBase } from 'mobx-view-model';
import { withViewModel, type ViewModelProps } from 'mobx-view-model-solid';

class CounterVM extends ViewModelBase {
  count = 0;
  increment = () => {
    this.count++;
  };
}

export const Counter = withViewModel(CounterVM, (props: ViewModelProps<CounterVM>) => (
  <button type="button" onClick={() => props.model.increment()}>
    {props.model.count}
  </button>
));
```

### Hook

```tsx
import { useCreateViewModel } from 'mobx-view-model-solid';

function Counter() {
  const model = useCreateViewModel(CounterVM);
  return (
    <button type="button" onClick={() => model.increment()}>
      {model.count}
    </button>
  );
}
```

### Store provider

```tsx
import { ViewModelStoreBase } from 'mobx-view-model';
import { ViewModelsProvider } from 'mobx-view-model-solid';

const viewModels = new ViewModelStoreBase();

<ViewModelsProvider value={viewModels}>
  <App />
</ViewModelsProvider>
```

## API

| API | Description |
| --- | --- |
| `withViewModel` | HOC: create VM, gate on `isMounted`, provide active VM context |
| `withPropsViewModel` | Same, but all props are the payload |
| `useCreateViewModel` | Create / lifecycle-manage a VM in a Solid component |
| `useViewModel` | Lookup an existing VM (store or active parent) |
| `ViewModelsProvider` | Provide `ViewModelStore` |
| `OnlyViewModel` | Declarative create without HOC |
| `enableObservableTracking` / `obs` | Re-exports from [mobx-solid](https://js2me.github.io/mobx-solid/) |

## Contribution Guide

Want to contribute? [Follow this guide](https://github.com/js2me/mobx-view-model/blob/master/CONTRIBUTING.md)
