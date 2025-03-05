<img src="assets/logo.png" align="right" height="156" alt="logo" />

# mobx-view-model  

[![NPM version][npm-image]][npm-url] [![test status][github-test-actions-image]][github-actions-url] [![build status][github-build-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundlephobia-image]][bundlephobia-url]


[npm-image]: http://img.shields.io/npm/v/mobx-view-model.svg
[npm-url]: http://npmjs.org/package/mobx-view-model
[github-test-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Test/badge.svg
[github-build-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Build/badge.svg
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions
[download-image]: https://img.shields.io/npm/dm/mobx-view-model.svg
[download-url]: https://npmjs.org/package/mobx-view-model
[bundlephobia-url]: https://bundlephobia.com/result?p=mobx-view-model
[bundlephobia-image]: https://badgen.net/bundlephobia/minzip/mobx-view-model


_MobX ViewModel power for ReactJS_   


[All documentation here](https://js2me.github.io/mobx-view-model/)   


## [`useCreateViewModel(VM, payload, config)`](src/hooks/use-create-view-model.ts#L9)  
Creates [`ViewModel`](#viewmodelimpl-viewmodel) instance.  
Using in [`withViewModel()`](#withviewmodel) HOC.    

## [`useViewModel()`](src/hooks/use-view-model.ts#L9)  
Hook that helps to get access to your view model in **React**.  
  Possible usage:   
    - `useViewModel<YourViewModel>()` - using generic to define type of returning view model instance  
    - `useViewModel<YourViewModel>(id)` - using `id` to define specific identifier of returning view model instance and generic for the same as above usage    


## [`withViewModel()()`](src/hoc/with-view-model.tsx)  
Required for usage HOC that connects your `ViewModel` class with `View` (**React** Component)  

#### Usage   

**1.** Simple   

```tsx
import { View } from "./view";
import { Model } from "./model";

export const Component = withViewModel(Model)(View?)  

...

<Component />
```   

**2.** Custom factory   

Advanced usage that needed to create your own implementations of `withViewModel` HOC, `ViewModelStore` and `ViewModel`  

```tsx
import { View } from "./view";
import { Model } from "./model";

export const Component = withViewModel(Model, {
  factory: (config) => {
    // also you can achieve this your view model store implementation
    return new config.VM(rootStore, config);
  }
})(View?)  

...

<Component />
```   

## [`withLazyViewModel()()`](src/hoc/with-lazy-view-model.tsx)  
Optional for usage HOC that doing the same thing as `withViewModel`, but fetching `ViewModel` and `View` "lazy"  

## [`ViewModelsConfig`](src/config/types.ts#L13)  
Additional configuration for all view models creating using library.  
You can override default global config using import [`viewModelsConfig`](src/config/global-config.ts#L26). You should do this before start whole app  
```ts
import { viewModelsConfig } from "mobx-view-model"

viewModelsConfig.comparePayload = 'strict';
viewModelsConfig.payloadObservable = 'ref';
viewModelsConfig.startViewTransitions = {
  mount: false,
  payloadChange: false,
  unmount: false,
};
// viewModelsConfig.generateId = undefined;
// viewModelsConfig.factory = undefined;
// viewModelsConfig.fallbackComponent = undefined;
// viewModelsConfig.onMount = undefined;
// viewModelsConfig.onUnmount = undefined;
```

Any other details are declared [here](src/config/types.ts#L13)    


<br />
