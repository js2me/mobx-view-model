# `useCreateViewModel` hook  

<ReactImportDeprecationWarning />

A hook that connects a [ViewModel](/api/view-models/overview) (or `ViewModelSimple`) to the React render tree, providing seamless MobX integration.  
It is used inside the [`withViewModel()`](/react/api/with-view-model) HOC.  

## API Signature
```tsx
function useCreateViewModel<VM extends AnyViewModel>(
  ViewModelClass: Class<VM>,
  payload?: ViewModelPayload<VM>,
  config?: UseCreateViewModelConfig<VM>
): VM;
```

## Configuration

| Option | Description |
| --- | --- |
| `id` | Stable instance id. Defaults to React [`useId()`](https://react.dev/reference/react/useId). |
| `factory` | Custom factory (same idea as [`viewModelsConfig.factory`](/api/view-models/view-models-config#factory)). |
| `vmConfig` | Per-instance [`ViewModelsConfig`](/api/view-models/view-models-config) overrides. |
| `ctx` | Extra context object passed into create config. |
| `anchors` | Extra lookup anchors for [`useViewModel`](/react/api/use-view-model). |
| `props` | Original component props forwarded into create config. |

When a [`ViewModelStore`](/api/view-model-store/interface) is present (via [`ViewModelsProvider`](/react/api/view-models-provider)), the hook uses [`defineStaged`](/api/view-model-store/interface#definestaged-config-owner) on the client: the VM is visible to render-phase lookups (`useViewModel`, `viewModels.get(...)`) via read-through, but becomes a committed store entry only when the component's commit effect runs. A render pass discarded by React (e.g. a duplicate fiber under `Suspense` in React 19) never commits — its staged entry is dropped by the store automatically, so no orphaned VMs are left behind. Stores without staging support fall back to [`define`](/api/view-model-store/interface#define). Otherwise it creates the instance via `factory` / global config and calls `init` / `mount` locally. Cleanup uses [`unmount`](/api/view-model-store/interface#unmountinstance) (with store) or `unmount()` (without).

::: tip SSR  
With [`viewModelsConfig.mode = 'ssr'`](/api/view-models/view-models-config#mode) on **React 19+**, if `mount()` / `willMount()` returns a Promise, the hook waits for it with React [`use()`](https://react.dev/reference/react/use) during SSR and the first client hydration. Wrap the tree in [`Suspense`](https://react.dev/reference/react/Suspense) for a loading UI — the hook suspends before a parent HOC [`fallback`](/react/api/with-view-model#fallback) can render.

On **React 18**, `use()` is unavailable, so the hook does not wait: the component can render while `isMounted` is still `false`. Use [`withViewModel`](/react/api/with-view-model)'s [`fallback`](/react/api/with-view-model#fallback), or gate on `model.isMounted` when calling this hook directly.
:::

##  Usage  

### 1. Basic Usage (Default Configuration)  
```tsx
import { useCreateViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const model = useCreateViewModel(YourVM);
})
```

### 2. Usage with payload
```tsx
import { useCreateViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const model = useCreateViewModel(YourVM, { userId: '1' });
})
```

### 3. Custom Configuration
```tsx
import { useCreateViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const model = useCreateViewModel(YourVM, {}, {
    ctx: {}, // extra create-config context
    factory: (config) => new config.VM(config), // factory method for creating VM instances
    id, // unique id if you need a single shared instance of your VM
    anchors: [], // additional components for useViewModel lookup
  });
})
```


### Example:  

```tsx
import { ViewModelBase } from "mobx-view-model";
import { useCreateViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";
import { observable, action } from "mobx";

class VM extends ViewModelBase {
  @observable
  accessor value = '';

  @action
  setValue = (value: string) => {
    this.value = value;
  }
}

export const YourComponent = observer(() => {
  const model = useCreateViewModel(VM)

  return (
    <div>
      <input value={model.value} onChange={e => model.setValue(e.target.value)} />
    </div>
  )
})
```
