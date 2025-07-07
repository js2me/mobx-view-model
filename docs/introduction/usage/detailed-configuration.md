# Detailed configuration

This way can be helpful when: 
 - if you need to override default factory method of creating view model instances in [ViewModelStore](/api/view-model-store/interface).  
 - if you need to inject root store into [ViewModelStore](/api/view-model-store/interface).  
 - if you need more control of the mounting\unmounting [ViewModels](/api/view-models/overview).  


Follow the steps:   

1. Make your own `ViewModel` implementation with accepting `RootStore` as `constructor` parameter   

```ts
// view-model.ts
// interface for your view model
import { ViewModel as ViewModelBase } from 'mobx-view-model';

export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends ViewModel<any> = ViewModel<any, any>,
> extends ViewModelBase<Payload, ParentViewModel> {}
```

```ts{15}
// view-model.impl.ts
// implementation for your interface
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

  // example of your custom methods
  // and properties
  get queryParams() {
    return this.rootStore.router.queryParams.data;
  }
}

```


1. Make your own `ViewModelStore` implementation with accepting `RootStore` as `constructor` parameter and overriding `createViewModel` method for transfer `rootStore`   

```ts{8,11,22,23,24}
// view-model.store.impl.ts
import {
  ViewModelParams,
  ViewModelStoreBase,
  ViewModel,
  ViewModelCreateConfig,
} from 'mobx-view-model';
import { ViewModelImpl } from "./view-model.impl.ts"

export class ViewModelStoreImpl extends ViewModelStoreBase {
  constructor(protected rootStore: RootStore) {
    super();
  }

  createViewModel<VM extends ViewModel<any, ViewModel<any, any>>>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;

    // here is you sending rootStore as
    // first argument into VM (your view model implementation)
    if (ViewModelImpl.isPrototypeOf(VM)) {
      return new VM(this.rootStore, config);
    }

    // otherwise it will be default behaviour
    // of this method
    return super.createViewModel(config);
  }
}
```

3. Add `ViewModelStore` into your `RootStore`   

```ts{8}
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

```tsx{2,4,10}
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
