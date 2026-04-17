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

## <ReactMark /> `vmConfig.useReactIds` {#usereactids}  
Optional flag on merged [`vmConfig`](/api/view-models/view-models-config) (same shape as [`viewModelsConfig`](/api/view-models/view-models-config)): when `true`, this hook always calls React [`useId()`](https://react.dev/reference/react/useId) and passes the result into view-model id generation as `renderId`. The same switch exists on global [`viewModelsConfig`](/api/view-models/view-models-config#usereactids).  

::: tip SSR  
Stable ids across server render and client hydration matter for SSR apps. Because `useId()` is matched between server and client for the same component tree, enabling `useReactIds` can help keep generated [`ViewModel`](/api/view-models/overview) ids consistent where you rely on that alignment.  
:::

#### Example
```tsx
const model = useCreateViewModel(YourVM, payload, {
  vmConfig: { useReactIds: true },
});
```

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
    vmConfig: { useReactIds: false }, // optional: pass React useId into VM id generation (see #usereactids)
    ctx: {}, // internal object used as cache key source inside this hook
    factory: (config) => new config.VM(config), // factory method for creating VM instances
    generateId, // custom fn for generating ids for VM instances
    id, // unique id if you need to create 1 instance of your VM
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
