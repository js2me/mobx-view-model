---
id: integration-guide
title: React intergation guide
sidebar_label: Integration
sidebar_position: 1
slug: /react/integration
---

# Integration with React  

Integration consist of **2-3 steps**.  

## 1. Connect ViewModel with View 
Your [ViewModel](/api/view-models/interface) should be connected with React view component  
To achieve this you can use:  
- [`withViewModel()` HOC](/react/api/with-view-model) - recommended way  
- [`useCreateViewModel()` hook](/react/api/use-create-view-model) - simplest way, more performant  

## 2. Render in React tree   

#### If you are using [withViewModel() HOC](/react/api/with-view-model)  
Then you should render component returned from this function  

```tsx
import { ViewModelBase, ViewModelProps } from "mobx-view-model";
import { observer } from "mobx-react-lite";

class YourComponentVM extends ViewModelBase {}

const YourComponentView = observer(({ model }: ViewModelProps<YourComponentVM>) => {
  return (
    <div>
      {model.id}
    </div>
  )
})

const YourComponent = withViewModel(YourComponent)(YourComponentView)

const YourApp = () => {
  return (
    <YourComponent />
  )
}
```

_wrapping into [`observer` HOC](https://mobx.js.org/api.html#observer) is optional if you are not using MobX observables_


#### If you are using [`useCreateViewModel()` hook](/react/api/use-create-view-model)  
Then you should render your React components with using this hook  

```tsx
import { ViewModelBase, ViewModelProps, useCreateViewModel } from "mobx-view-model";
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


## 3. _[Optional]_ Using [ViewModelStore](/api/view-model-store/interface)  
[ViewModelStore](/api/view-model-store/interface) is very powerful thing which allows you to lookup and get access to your view model instances everywhere.  
To use this store:
  1. Create instance of `ViewModelStore`
  2. Wrap your application into [`ViewModelsProvider`](/react/api/view-models-provider) Context Provider.  

```tsx
import { ViewModelsProvider, ViewModelStoreBase } from "mobx-view-model";

const vmStore = new ViewModelStoreBase();

const YourApp = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      ...
    </ViewModelsProvider>
  )
}
```
With this step you can use [`useViewModel()`](/react/api/use-view-model) hook with first argument  

::: tip [`isMounted`](/api/view-models/interface#ismounted-boolean) state  
This statement totally based on call [`mount()` method](/api/view-models/interface#mount-void-promise-void) which calls inside [`useCreateViewModel()`](/react/api/use-create-view-model) hook.  
Because of this on the first render `isMounted` will be `false`, because mounting happens inside `useLayoutEffect\useEffect` react hook.  
:::

::: warning Do not calls [`mount()`](/api/view-models/interface#mount-void-promise-void), [`unmount()`](/api/view-models/interface#unmount-void-promise-void) manually  
This methods already calling inside [`ViewModelStore` base implementation](/api/view-model-store/base-implementation) or inside [`useCreateViewModel`](/react/api/use-create-view-model) hook.
:::