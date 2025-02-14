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


## What package has   

## [`ViewModelBase`](src/view-model/view-model.base.ts), [`ViewModel`](src/view-model/view-model.ts)   
It is a class that helps to manage state and lifecycle of a component in **React**.  

### Methods and properties of [ViewModel](src/view-model/view-model.ts)  
- **`id`** - The unique identifier for the view model.  
- **`payload`** - object that contains the data that is passed from the parent component.  
- **`isMounted`** - state that determines if [ViewModel](src/view-model/view-model.ts)  is mounted together with a component.  
- **`parentViewModel`** - parent view model of the current view model. (Works only with [ViewModelStore](src/view-model/view-model.store.ts) and [ViewModelsProvider](src/contexts/view-models-context.ts))  
- **`mount()`** - this method is called when the component is mounted in the React tree.  
- **`didMount()`** - this method that is called after the view model is fully mounted.  
- **`didUnmount()`** - this method that is called after the view model is fully unmounted.  
- **`unmount()`** - this method is called when the component is starts unmounting from the React tree.  
- **`setPayload(payload: Payload)`** - this method that sets the payload of the view model.  
- **`payloadChanged()`** - this method that is called when the payload is changed.  

Any other details are declared [here](src/view-model/view-model.ts), base imlementation contains [here](src/view-model/view-model.base.ts)  


## [`ViewModelStoreBase`](src/view-model/view-model.store.base.ts), [`ViewModelStore`](src/view-model/view-model.store.ts)  
It is store for managing view models.  
P.S not required entity for targeted usage of this package, but can be helpful for accessing view models from everywhere by view model id or view model class name.   

## [`useCreateViewModel(VM, payload, config)`](src/hooks/use-create-view-model.ts)  
Creates [`ViewModel`](#viewmodelimpl-viewmodel) instance.  
Using in [`withViewModel()`](#withviewmodel) HOC.    

## [`useViewModel()`](src/hooks/use-view-model.ts)  
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

## [`ViewModelsConfig`](src/config/types.ts)  
Additional configuration for all view models creating using library.  
You can override default global config using import [`viewModelsConfig`](src/config/global-config.ts). You should do this before start whole app  
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

Any other details are declared [here](src/config/types.ts)    


<br />

# Usage  

## Simple  

```tsx
import { ViewModelProps, ViewModelImpl, withViewModel } from 'mobx-view-model';

export class MyPageVM extends ViewModelImpl<{ payloadA: string }> {
  @observable
  accessor state = '';

  mount() {
    super.mount();
  }

  didMount() {
    console.info('did mount');
  }

  unmount() {
    super.unmount();
  }
}

const MyPageView = observer(({ model }: ViewModelProps<MyPageVM>) => {
  return <div>{model.state}</div>;
});

export const MyPage = withViewModel(MyPageVM)(MyPageView);

<MyPage payload={{ payloadA: '1' }} />

```  

## Detailed Configuration  

1. Make your own ViewModelStore implementation   

```ts
// view-model.store.impl.ts
import {
  ViewModelParams,
  ViewModelStoreBase,
  ViewModel,
  ViewModelCreateConfig,
} from 'mobx-view-model';

export class ViewModelStoreImpl extends ViewModelStoreBase {
  constructor(protected rootStore: RootStore) {
    super();
  }

  createViewModel<VM extends ViewModel<any, ViewModel<any, any>>>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;
    // here is you sending rootStore as first argument into VM (your view model implementation)
    return new VM(this.rootStore, config);
  }
}
```

2. Make your own `ViewModel` implementation with sharing `RootStore`   

```ts
// view-model.ts
import { ViewModel as ViewModelBase } from 'mobx-view-model';

export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends ViewModel<any> = ViewModel<any, any>,
> extends ViewModelBase<Payload, ParentViewModel> {}
```

```ts
// view-model.impl.ts
import { ViewModelBase, ViewModelParams } from 'mobx-view-model';
import { ViewModel } from './view-model';

export class ViewModelImpl<
    Payload extends AnyObject = EmptyObject,
    ParentViewModel extends ViewModel<any> = ViewModel<any>,
  >
  extends ViewModelBase<Payload, ParentViewModel>
  implements ViewModel<Payload, ParentViewModel>
{
  constructor(
    protected rootStore: RootStore,
    params: ViewModelParams<Payload, ParentViewModel>,
  ) {
    super(params);
  }

  get queryParams() {
    return this.rootStore.router.queryParams.data;
  }

  protected getParentViewModel(
    parentViewModelId: Maybe<string>,
  ): ParentViewModel | null {
    return this.rootStore.viewModels.get<ParentViewModel>(parentViewModelId);
  }
}

```

3. Add `ViewModelStore` into your `RootStore`   

```ts
import { ViewModelStore } from 'mobx-view-model';
import { ViewModelStoreImpl } from '@/shared/lib/mobx';


export class RootStoreImpl implements RootStore {
  viewModels: ViewModelStore;

  constructor() {
    this.viewModels = new ViewModelStoreImpl(this);
  }
}
```  


4. Create `View` with `ViewModel`   

```tsx
import { ViewModelProps, withViewModel } from 'mobx-view-model';
import { ViewModelImpl } from '@/shared/lib/mobx';

export class MyPageVM extends ViewModelImpl {
  @observable
  accessor state = '';

  async mount() {
    // this.isMounted = false;
    await this.rootStore.beerApi.takeBeer();
    super.mount(); // this.isMounted = true
  }

  didMount() {
    console.info('did mount');
  }

  unmount() {
    super.unmount();
  }
}

const MyPageView = observer(({ model }: ViewModelProps<MyPageVM>) => {
  return <div>{model.state}</div>;
});

export const MyPage = withViewModel(MyPageVM)(MyPageView);
```


# Project examples  

- **HTTP Status Codes**  
_Links_:  
  - Source: https://github.com/js2me/http-status-codes  
  - GitHub Pages: https://js2me.github.io/http-status-codes/#/  


- **Time Tracker app**  
_Links_:  
  - Source: https://github.com/js2me/time-tracker-app  
  - GitHub Pages: https://js2me.github.io/time-tracker-app/  

