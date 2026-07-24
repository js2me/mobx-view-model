---
id: integration-guide
title: React integration guide
sidebar_label: Integration
sidebar_position: 1
slug: /react/integration
---

# Integration with React  

<ReactImportDeprecationWarning />

## Import path `mobx-view-model-react`

React integration APIs — [`withViewModel`](/react/api/with-view-model), [`withPropsViewModel`](/react/api/with-props-view-model), [`useCreateViewModel`](/react/api/use-create-view-model), [`useViewModel`](/react/api/use-view-model), [`ViewModelsProvider`](/react/api/view-models-provider), [`OnlyViewModel`](/react/api/only-view-model), and related types such as `ViewModelProps` — are published under the **`mobx-view-model-react`** subpath.

Keep importing view-model classes, stores, and global configuration from **`mobx-view-model`**:

```ts
import { ViewModelBase, ViewModelStoreBase, viewModelsConfig } from "mobx-view-model";
import { withViewModel, ViewModelProps } from "mobx-view-model-react";
```

The root **`mobx-view-model`** package still re-exports these symbols for backward compatibility, but that path is **deprecated**; use **`mobx-view-model-react`** for all React-related imports.

Integration consists of **2-3 steps**.  

## 1. Connect ViewModel with View 
Your [ViewModel](/api/view-models/interface) should be connected to a React view component.  
To achieve this you can use:
- [`withViewModel()` HOC](/react/api/with-view-model) - recommended way
- [`withPropsViewModel()` HOC](/react/api/with-props-view-model) - same as `withViewModel`, but all component props become `payload` (no `payload` prop)
- [`useCreateViewModel()` hook](/react/api/use-create-view-model) - simplest way, more performant in many cases  

## 2. Render in React tree   

#### use [withViewModel() HOC](/react/api/with-view-model)  
Then you should render the component returned from this function  

```tsx
import { ViewModelBase } from "mobx-view-model";
import { ViewModelProps, withViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";

class YourComponentVM extends ViewModelBase {}

export interface YourComponentProps extends ViewModelProps<YourComponentVM> {
  yourProp?: string;
}

const YourComponent = withViewModel(
  YourComponentVM,
  ({ model, yourProp }: YourComponentProps) => {
    return <div>{model.id}</div>;
  },
);

const YourApp = () => {
  return (
    <YourComponent />
  )
}
```


#### use [`useCreateViewModel()` hook](/react/api/use-create-view-model)  
Then you should render your React components using this hook  

```tsx
import { ViewModelBase } from "mobx-view-model";
import { useCreateViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";

class YourComponentVM extends ViewModelBase {}

const YourComponent = observer(() => {
  const model = useCreateViewModel(YourComponentVM);

  return (
    <div>
      {model.id}
    </div>
  )
})

const YourApp = () => {
  return (
    <YourComponent />
  )
}
```


## 3. _\[Optional\]_ Use [ViewModelStore](/api/view-model-store/interface)  
[ViewModelStore](/api/view-model-store/interface) is a powerful tool that allows you to look up and access your view model instances anywhere.  
To use this store:
  1. Create instance of `ViewModelStore`
  2. Wrap your application into [`ViewModelsProvider`](/react/api/view-models-provider) Context Provider.  

```tsx
import { ViewModelStoreBase } from "mobx-view-model";
import { ViewModelsProvider } from "mobx-view-model-react";

const vmStore = new ViewModelStoreBase();

const YourApp = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      ...
    </ViewModelsProvider>
  )
}
```
With this step you can use the [`useViewModel()`](/react/api/use-view-model) hook with the first argument  

::: tip [`isMounted`](/api/view-models/interface#ismounted-boolean) state  
This state is based on calling the [`mount()` method](/api/view-models/interface#mount-void-promise-void), which runs inside [`useCreateViewModel()`](/react/api/use-create-view-model) during render (after [`define`](/api/view-model-store/interface#define) when a store is present).  
If `mount()` / [`willMount()`](/api/view-models/base-implementation#willmount-void) finishes synchronously, `isMounted` is already `true` on the first paint. Async mount keeps it `false` until the promise settles — use [`fallback`](/react/api/with-view-model#fallback) / `Suspense` when needed.
:::

::: warning Do not call [`mount()`](/api/view-models/interface#mount-void-promise-void) / [`unmount()`](/api/view-models/interface#unmount-void) manually  
These methods are already called inside [`useCreateViewModel`](/react/api/use-create-view-model) (via [`define`](/api/view-model-store/interface#define) / [`unmountNew`](/api/view-model-store/interface#unmountnewinstance) when a store is present).
:::