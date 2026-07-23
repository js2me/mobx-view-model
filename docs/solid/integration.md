---
id: solid-integration-guide
title: SolidJS integration guide
sidebar_label: Integration
sidebar_position: 1
slug: /solid/integration
---

# Integration with SolidJS

Solid integration APIs — [`withViewModel`](/solid/api/with-view-model), [`withPropsViewModel`](/solid/api/with-props-view-model), [`useCreateViewModel`](/solid/api/use-create-view-model), [`useViewModel`](/solid/api/use-view-model), [`ViewModelsProvider`](/solid/api/view-models-provider), [`OnlyViewModel`](/solid/api/only-view-model) — live in the **`mobx-view-model-solid`** package.

Keep importing view-model classes, stores, and global configuration from **`mobx-view-model`**:

```ts
import { ViewModelBase, ViewModelStoreBase, viewModelsConfig } from "mobx-view-model";
import { withViewModel, ViewModelProps, enableObservableTracking } from "mobx-view-model-solid";
```

MobX ↔ Solid reactivity is powered by [mobx-solid](https://js2me.github.io/mobx-solid/llms.txt). After `enableObservableTracking()`, you read MobX observables directly in JSX — **no `observer` wrappers**.

Integration consists of **2–4 steps**.

## 0. Enable MobX tracking (required once)

Call once at the app entry point, before any MobX reads inside Solid computations or JSX:

```tsx
import { enableObservableTracking } from "mobx-view-model-solid";
import { render } from "solid-js/web";

enableObservableTracking();

render(() => <App />, document.getElementById("app")!);
```

::: tip Safety net  
`useCreateViewModel` / `withViewModel` also call `enableObservableTracking()` (it is a no-op if already enabled). Prefer an explicit call at entry for clarity.  
:::

`enableObservableTracking` and `obs` are re-exported from `mobx-view-model-solid` for convenience. See [mobx-solid docs](https://js2me.github.io/mobx-solid/).

## 1. Connect ViewModel with View

Your [ViewModel](/api/view-models/interface) should be connected to a Solid view. You can use:

- [`withViewModel()` HOC](/solid/api/with-view-model) — recommended
- [`withPropsViewModel()` HOC](/solid/api/with-props-view-model) — same, but all component props become `payload`
- [`useCreateViewModel()` hook](/solid/api/use-create-view-model) — create a VM inside a component

## 2. Render in the Solid tree

#### use [withViewModel() HOC](/solid/api/with-view-model)

```tsx
import { ViewModelBase } from "mobx-view-model";
import { ViewModelProps, withViewModel } from "mobx-view-model-solid";

class YourComponentVM extends ViewModelBase {}

export interface YourComponentProps extends ViewModelProps<YourComponentVM> {
  yourProp?: string;
}

const YourComponent = withViewModel(
  YourComponentVM,
  (props: YourComponentProps) => {
    return <div>{props.model.id}</div>;
  },
);

const YourApp = () => {
  return <YourComponent />;
};
```

#### use [`useCreateViewModel()` hook](/solid/api/use-create-view-model)

```tsx
import { ViewModelBase } from "mobx-view-model";
import { useCreateViewModel } from "mobx-view-model-solid";

class YourComponentVM extends ViewModelBase {}

const YourComponent = () => {
  const model = useCreateViewModel(YourComponentVM);

  return <div>{model.id}</div>;
};

const YourApp = () => {
  return <YourComponent />;
};
```

::: tip Reading observables  
Solid component bodies run **once**. Read MobX state **inside JSX** (or Solid computations), not as a one-shot snapshot in the body — see [Reading Observables](https://js2me.github.io/mobx-solid/guide/reading-observables).  
:::

## 3. _[Optional]_ Use [ViewModelStore](/api/view-model-store/interface)

1. Create an instance of `ViewModelStore`
2. Wrap the app in [`ViewModelsProvider`](/solid/api/view-models-provider)

```tsx
import { ViewModelStoreBase } from "mobx-view-model";
import { ViewModelsProvider } from "mobx-view-model-solid";

const vmStore = new ViewModelStoreBase();

const YourApp = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      ...
    </ViewModelsProvider>
  );
};
```

With a store you can use [`useViewModel()`](/solid/api/use-view-model) with a lookup argument.

::: tip [`isMounted`](/api/view-models/interface#ismounted-boolean)  
Mounting is started from [`useCreateViewModel`](/solid/api/use-create-view-model). `withViewModel` waits until `isMounted` before rendering the view (or shows `fallback`).  
:::

::: warning Do not call [`mount()`](/api/view-models/interface#mount-void-promise-void) / [`unmount()`](/api/view-models/interface#unmount-void-promise-void) manually  
These are already called by [`ViewModelStore`](/api/view-model-store/base-implementation) or [`useCreateViewModel`](/solid/api/use-create-view-model).  
:::
